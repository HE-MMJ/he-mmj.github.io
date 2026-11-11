"""
Build Dashboard Gabungan MMJ (Coal Hauling + Batu Split + Loss Time + Rainfall) dalam SATU file HTML.

- Memakai generator yang sudah ada (tidak diubah):
    01. Dashboard\\00. Dashboard Coal Hauling\\Dashboard Tools\\update_dashboard_hauling.py -> Coal Hauling
    06. Rock\\01. Input Daily\\Dashboard Tools\\update_dashboard.py      -> Batu Split
    03. Rainfall\\Dashboard Tools\\update_dashboard_losstime.py         -> Loss Time & Rainfall
- Hasil generator ditulis ke folder cache (dashboard lama TIDAK ditimpa).
- Keduanya ditanam ke "Dashboard MMJ 2026.html" sebagai <template>; dashboard yang dipilih
  dipasang langsung ke halaman (tanpa iframe / document.write) agar bisa dibuka di HP.
  Pindah tab dilakukan di halaman yang sama (tanpa muat ulang), karena pembuka file di HP
  tidak mendukung muat ulang.
- Update dilakukan manual: klik "Update Dashboard Gabungan.bat" setelah Excel disimpan.
  (Auto update dinonaktifkan; filenya diarsip di Tools\nonaktif - auto update.)

Cara pakai: python build_gabungan.py   (atau klik "Update Dashboard Gabungan.bat")
"""
import os, sys, io, re, base64, json, contextlib, importlib.util, datetime as dt, traceback

TOOLS = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.dirname(TOOLS)                                   # ...\00. Dashboard HTML Gabungan
DAILY = os.path.abspath(os.path.join(HOME, "..", ".."))           # ...\01. Daily Report
CACHE = os.path.join(TOOLS, "cache")
OUTPUT = os.path.join(HOME, "Dashboard MMJ 2026.html")
VERSION_JS = os.path.join(HOME, "dashboard_version.js")

PARTS = {
    "haul": {"name": "Coal Hauling",
             "script": os.path.join(DAILY, "01. Dashboard", "00. Dashboard Coal Hauling", "Dashboard Tools", "update_dashboard_hauling.py")},
    "batu": {"name": "Batu Split",
             "script": os.path.join(DAILY, "06. Rock", "01. Input Daily", "Dashboard Tools", "update_dashboard.py")},
    "lt":   {"name": "Loss Time & Rainfall",
             "script": os.path.join(DAILY, "03. Rainfall", "Dashboard Tools", "update_dashboard_losstime.py")},
}
# pola file sumber yang dipantau auto_update.py
WATCH = [
    os.path.join(DAILY, "06. Rock", "01. Input Daily", "*Database Angkutan Batu Split*.xlsx"),
    os.path.join(DAILY, "03. Rainfall", "*", "*Info stop Hauling R_*.xlsx"),
    os.path.join(DAILY, "06. Rock", "01. Input Daily", "Dashboard Tools", "dashboard_template.html"),
    os.path.join(DAILY, "03. Rainfall", "Dashboard Tools", "losstime_template.html"),
]

# halaman tambahan tanpa generator (dibuat dari template di folder Tools)
EXTRA = {"exec": {"name": "Dashboard Eksekutif", "file": os.path.join(TOOLS, "exec_template.html")}}
ORDER = ["exec", "haul", "batu", "lt"]

# menu pilihan dashboard: dipindah ke sidebar tiap dashboard (OVERVIEW / MONITORING), tanpa iframe
BAR_CSS = """<style>
.side{overflow-y:auto;scrollbar-width:thin}
.mmjnav{display:flex;flex-direction:column;gap:2px;margin:0 0 6px}
.mmjnav .mlbl{font-size:10.5px;letter-spacing:.16em;color:var(--muted);margin:6px 10px 4px;text-transform:uppercase;font-weight:600}
.mmjnav a{display:flex;align-items:center;gap:12px;padding:9px 14px;border-radius:12px;text-decoration:none;color:var(--ink-2);font-weight:500;font-size:13.5px;transition:background .15s,color .15s;white-space:nowrap}
.mmjnav a:hover{background:var(--accent-soft);color:var(--ink)}
.mmjnav a svg{width:18px;height:18px;flex:none}
.mmjnav a[aria-current="page"]{background:var(--accent);color:#fff;font-weight:600;box-shadow:0 6px 14px color-mix(in srgb,var(--accent) 30%,transparent)}
.mmjnav .mmjg{font-size:10.5px;color:var(--muted);margin:4px 10px 0}
.mmjnav .mhere{margin-top:10px}
.mmjtop{max-width:1500px;margin:0 auto;padding:12px 20px 0}
@media (max-width:1000px){
  .mmjnav{flex-direction:row;flex-wrap:nowrap;overflow-x:auto;flex:1 1 100%;order:2;margin:6px 0 2px;gap:4px;scrollbar-width:none}
  .mmjnav .mlbl,.mmjnav .mmjg{display:none}
  .mmjnav a{padding:7px 11px;font-size:12.5px;gap:7px;background:var(--surface-2)}
  .mmjnav a svg{width:15px;height:15px}
}
@media print{.mmjnav,.mmjtop{display:none!important}}
</style>"""
_IC = {
    "exec": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/></svg>',
    "haul": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 16V7h11v9M13 10h4l4 4v2h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/></svg>',
    "batu": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/></svg>',
    "lt": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
    "rf": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 9a4 4 0 0 1-1 7.9M8 19l-1 2M12 18l-1 3M16 19l-1 2"/></svg>',
}
BAR_HTML = ('<div class="mmjnav" id="mmjNav" role="navigation" aria-label="Pilih dashboard">'
            '<div class="mlbl">Overview</div>'
            f'<a href="#tab=exec" data-mmjtab="exec">{_IC["exec"]}Dashboard Eksekutif</a>'
            '<div class="mlbl">Monitoring</div>'
            f'<a href="#tab=haul" data-mmjtab="haul">{_IC["haul"]}Coal Hauling</a>'
            f'<a href="#tab=batu" data-mmjtab="batu">{_IC["batu"]}Batu Split</a>'
            f'<a href="#tab=lt" data-mmjtab="lt">{_IC["lt"]}Loss Time</a>'
            f'<a href="#tab=rf" data-mmjtab="rf">{_IC["rf"]}Rainfall</a>'
            '<div class="mmjg">Data per __GEN__</div>'
            '<div class="mlbl mhere">Menu halaman</div></div>')
BAR_JS = r"""<script>
(function(){
  window.__MMJ_TAB = "__MMJ_TAB__";
  /* pindahkan menu dashboard ke sidebar (di bawah logo); tanpa sidebar tetap di atas halaman */
  var nav = document.getElementById("mmjNav"), side = document.querySelector(".side"), logo = side && side.querySelector(".logo");
  if(nav && side){ if(logo && logo.nextSibling) side.insertBefore(nav, logo.nextSibling); else side.insertBefore(nav, side.firstChild); }
  else if(nav){ var top = document.createElement("div"); top.className = "mmjtop"; nav.parentNode.insertBefore(top, nav); top.appendChild(nav); var h = nav.querySelector(".mhere"); if(h) h.remove(); }
  var mark = function(){ document.querySelectorAll("[data-mmjtab]").forEach(function(a){ if(a.dataset.mmjtab===window.__MMJ_TAB) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); }); };
  var lt = function(t){ return t==="lt" || t==="rf"; };
  document.querySelectorAll("[data-mmjtab]").forEach(function(a){
    a.addEventListener("click", function(e){
      e.preventDefault(); var t = a.dataset.mmjtab;
      if(t===window.__MMJ_TAB) return;
      try{ localStorage.setItem("mmjTab", t); }catch(x){}
      if(lt(t) && lt(window.__MMJ_TAB) && typeof window.setView==="function"){ window.__MMJ_TAB=t; window.setView(t); mark(); return; }
      if(typeof window.mmjSwitch==="function") window.mmjSwitch(t);     /* pindah dashboard tanpa muat ulang */
    });
  });
  if(window.__mmjObs){ try{ window.__mmjObs.disconnect(); }catch(x){} window.__mmjObs = null; }
  if(lt(window.__MMJ_TAB) && typeof window.setView==="function"){
    window.setView(window.__MMJ_TAB);
    window.__mmjObs = new MutationObserver(function(){ var v=document.body.dataset.v; if(v && v!==window.__MMJ_TAB){ window.__MMJ_TAB=v; mark(); try{ localStorage.setItem("mmjTab", v); }catch(x){} } });
    window.__mmjObs.observe(document.body, {attributes:true, attributeFilter:["data-v"]});
  }
  mark();
})();
</script>"""


def html_escape(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


def run_generator(key):
    """Jalankan generator lama, tapi tulis hasilnya ke cache (bukan ke dashboard lama)."""
    part = PARTS[key]
    out = os.path.join(CACHE, f"{key}.html")
    spec = importlib.util.spec_from_file_location(f"mmj_gen_{key}", part["script"])
    mod = importlib.util.module_from_spec(spec)
    old_argv = sys.argv
    buf = io.StringIO()
    try:
        sys.argv = [part["script"]]
        with contextlib.redirect_stdout(buf):
            spec.loader.exec_module(mod)
            mod.OUTPUT = out
            mod.main()
    finally:
        sys.argv = old_argv
    log = [l for l in buf.getvalue().splitlines() if l.strip()]
    return out, log


def build():
    os.makedirs(CACHE, exist_ok=True)
    stamp = dt.datetime.now()
    status = {}
    for key, part in PARTS.items():
        try:
            out, log = run_generator(key)
            status[key] = {"ok": True, "msg": log[-1] if log else "", "log": log}
            print(f"[OK]    {part['name']}")
            for l in log:
                print("        " + l)
        except SystemExit as e:
            status[key] = {"ok": False, "msg": str(e)}
            print(f"[GAGAL] {part['name']}: {e}")
        except Exception as e:
            status[key] = {"ok": False, "msg": f"{type(e).__name__}: {e}"}
            print(f"[GAGAL] {part['name']}: {e}")
            traceback.print_exc()

    # tiap dashboard disimpan sebagai <template> (HTML biasa yang belum aktif). Saat file dibuka,
    # dashboard terpilih dipasang ke halaman (tanpa iframe / document.write) agar terbaca di HP.
    gen = stamp.strftime("%d-%m-%Y %H:%M")
    templates = []
    for key in ORDER:
        part = PARTS.get(key) or EXTRA[key]
        path = part["file"] if key in EXTRA else os.path.join(CACHE, f"{key}.html")
        if key in EXTRA:
            status[key] = {"ok": os.path.exists(path), "msg": "" if os.path.exists(path) else "template tidak ada"}
        if not os.path.exists(path):
            continue
        html = open(path, encoding="utf-8").read()
        h0, h1 = html.find("<head>"), html.find("</head>")
        head = html[h0 + 6:h1] if h0 >= 0 and h1 > h0 else ""
        heads = re.findall(r"<style\b.*?</style>|<link\b[^>]*>|<title\b.*?</title>", head, re.S)
        heads = [x for x in heads if 'rel="icon"' not in x] + [BAR_CSS]
        heads = [re.sub(r"^<(style|link|title)", r"<\1 data-mmj-head", x) for x in heads]
        b = html.find("<body")
        body = html[html.find(">", b) + 1: html.rfind("</body>")] if b >= 0 else html
        if "</template" in body:
            raise SystemExit(f"{part['name']}: isi dashboard mengandung </template>, tidak bisa digabung")
        templates.append(f'<template id="mmjT_{key}">\n' + "\n".join(heads) + "\n"
                         + BAR_HTML.replace("__GEN__", gen) + "\n" + body + "\n" + BAR_JS + "\n</template>")
        if not status[key]["ok"]:
            status[key]["msg"] += " · menampilkan data terakhir yang berhasil"

    shell = open(os.path.join(TOOLS, "shell_template.html"), encoding="utf-8").read()
    shell = shell.replace("<!--TEMPLATES-->", "\n".join(templates))
    logo = os.path.join(DAILY, "06. Rock", "01. Input Daily", "Dashboard Tools", "logo_mmj.png")
    if os.path.exists(logo):
        shell = shell.replace("__LOGO__", "data:image/png;base64," + base64.b64encode(open(logo, "rb").read()).decode())
    tmp = OUTPUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(shell)
    os.replace(tmp, OUTPUT)                      # tulis atomik: halaman tidak pernah setengah jadi
    print(f"Selesai : {OUTPUT}  ({stamp:%d-%m-%Y %H:%M:%S})")
    return all(v["ok"] for v in status.values())


if __name__ == "__main__":
    ok = build()
    sys.exit(0 if ok else 1)
