"""
Gabungkan 2 Pages menjadi halaman utama modular: `index.html` (root repo) + `assets/`

- Sumber shell   : dashboard-mmj/index.html                    (dibaca, TIDAK diubah)
- Sumber HE      : tools/gabungan/he_index.html (HTML) + css/style.css, js/*.js,
                    assets/logo-mmj.png, data/belum.json (root repo, dibaca saja)
- Keluaran       : index.html  ->  https://he-mmj.github.io/
                   assets/css, assets/data, assets/js  (lihat emit_site.py)

Isi hasil:
  * tab "Heavy Equipment" (dashboard HE sebagai <template id="mmjT_he">)
  * Monitoring (Dashboard Eksekutif) menampilkan ringkasan data HE + Water Truck
  * HTML hanya berisi markup; CSS, data dan logika dipisah ke folder assets/

Jalankan: python build_gabungan_he.py
"""
import os, re, json, base64, datetime as dt, importlib.util

TOOLS = os.path.dirname(os.path.abspath(__file__))
GAB = os.path.abspath(os.path.join(TOOLS, "..", ".."))          # folder dashboard-mmj
ROOT = os.path.abspath(os.path.join(GAB, ".."))                 # root repo
SRC_SHELL = os.path.join(GAB, "index.html")
OUT = os.path.join(ROOT, "index.html")          # hasil = halaman utama GitHub Pages

HTML = os.path.join(TOOLS, "he_index.html")     # sumber HTML dashboard HE (salinan)
CSS = os.path.join(ROOT, "css", "style.css")
JS_DATA = os.path.join(ROOT, "js", "data.js")
JS_WT = os.path.join(ROOT, "js", "wt-data.js")
JS_APP = os.path.join(ROOT, "js", "app.js")
JS_WTJS = os.path.join(ROOT, "js", "wt.js")
JS_STD = os.path.join(ROOT, "js", "standar-he.js")   # data kontrol SOP (Fuel Ratio & MA)
LOGO = os.path.join(ROOT, "assets", "logo-mmj.png")
BELUM = os.path.join(ROOT, "data", "belum.json")
THEME_CSS = os.path.join(TOOLS, "he_mmj_theme.css")


def read(p):
    with open(p, encoding="utf-8-sig") as f:
        return f.read()


def js_to_json(txt):
    txt = re.sub(r'([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:', r'\1"\2":', txt)
    return json.loads(txt)


def js_const(txt, name):
    i = txt.index("const %s" % name)
    j = txt.index("[", i)
    depth = 0
    for k in range(j, len(txt)):
        if txt[k] == "[":
            depth += 1
        elif txt[k] == "]":
            depth -= 1
            if depth == 0:
                break
    return js_to_json(txt[j:k + 1])


def num(v):
    try:
        s = str(v if v is not None else "").replace("%", "").replace(",", ".")
        return float(s) if s not in ("", "-") else 0.0
    except Exception:
        return 0.0


# ------------------------------------------------------------------ ringkasan HE
def build_summary():
    data = js_const(read(JS_DATA), "DATA")
    wt = js_const(read(JS_WT), "WT_DATA")
    he = [d for d in data if (d.get("Jenis") or "") != "Water Truck"]

    belum = set()
    batas = 0
    if os.path.exists(BELUM):
        try:
            blist = json.loads(read(BELUM))
            rows = []
            for b in blist:
                days = b.get("Days") or {}
                rows.append([num(days.get(str(h))) > 0 for h in range(1, 31)])
            # hari terakhir yang datanya sudah majorité masuk (>=50% unit) -> dianggap jatuh tempo
            for h in range(30, 0, -1):
                n = sum(1 for r in rows if r[h - 1])
                if rows and n / len(rows) >= 0.5:
                    batas = h
                    break
            # "terlambat >1 hari": ada hari kosong <= batas-1
            for b, r in zip(blist, rows):
                for h in range(1, batas):
                    if not r[h - 1]:
                        belum.add(b.get("Unit"))
                        break
        except Exception:
            pass

    vend = {}
    for d in he:
        v = d.get("Vendor") or "-"
        a = vend.setdefault(v, {"unit": 0, "hm": 0.0, "ma": [], "fuel": 0.0})
        a["unit"] += 1
        a["hm"] += num(d.get("HMTotal"))
        a["fuel"] += num(d.get("Fuel"))
        m = num(d.get("MA"))
        if m > 0:
            a["ma"].append(m)
    vendor = [{"v": v, "unit": a["unit"], "hm": round(a["hm"], 1),
                "ma": round(sum(a["ma"]) / len(a["ma"]), 1) if a["ma"] else 0,
                "fuel": round(a["fuel"], 1)}
               for v, a in sorted(vend.items())]

    wtr = []
    for d in wt:
        hm = p = 0.0
        for k, dv in (d.get("Days") or {}).items():
            hm += num(dv.get("HM"))
            p += num(dv.get("P"))
        wtr.append({"u": d.get("Unit"), "v": d.get("Vendor"), "p": round(p, 1),
                    "hm": round(hm, 1), "ma": num(d.get("MA")), "pa": num(d.get("PA"))})

    rows = [{"u": d.get("Unit"), "v": d.get("Vendor"), "a": d.get("Area"), "j": d.get("Jenis"),
             "ma": num(d.get("MA")), "hm": num(d.get("HMTotal")), "pa": num(d.get("PAPct")),
             "fuel": num(d.get("Fuel")), "ratio": num(d.get("FuelRatio")),
             "cap": d.get("Capacity") or "",
             "belum": 1 if d.get("Unit") in belum else 0} for d in he]

    ma = [num(d.get("MA")) for d in he if num(d.get("MA")) > 0]
    pa = [num(d.get("PAPct")) for d in he if num(d.get("PAPct")) > 0]
    ratio = [num(d.get("FuelRatio")) for d in he if num(d.get("FuelRatio")) > 0]

    return {"meta": {"generated": dt.datetime.now().strftime("%d-%m-%Y %H:%M"),
                     "periode": "November 2026", "lastDate": "2026-11-30"},
            "unit": len(he), "wtUnit": len(wt), "totalUnit": len(he) + len(wt),
            "hm": round(sum(num(d.get("HMTotal")) for d in he), 1),
            "ma": round(sum(ma) / len(ma), 1) if ma else 0,
            "pa": round(sum(pa) / len(pa), 1) if pa else 0,
            "fuel": round(sum(num(d.get("Fuel")) for d in he), 1),
            "ratio": round(sum(ratio) / len(ratio), 2) if ratio else 0,
            "penyiraman": round(sum(w["p"] for w in wtr)),
            "belumUnit": sum(1 for r in rows if r["belum"]),
            "vendor": vendor, "rows": rows, "wt": wtr}


# ------------------------------------------------------------------ template HE
def build_he_template(summary):
    html = read(HTML)
    css = read(CSS)
    theme = read(THEME_CSS)
    b = html.find("<body")
    body = html[html.find(">", b) + 1: html.rfind("</body>")]
    body = re.sub(r'\s*<script src="js/[^"]+"></script>', "", body)
    body = body.replace('src="assets/logo-mmj.png"', 'src="__HE_LOGO__"')
    # "<main class="wrap">" -> div (MMJ shell punya <main> sendiri)
    body = body.replace('<main class="wrap">', '<div class="wrap">')
    body = body.replace('</main>', '</div>')

    # tiap bagian dikirim terpisah supaya bisa jadi file JS sendiri (assets/)
    js_parts = {
        "he": read(JS_DATA),
        "std": read(JS_STD),
        "wt": read(JS_WT),
        "app": "\n".join([read(JS_APP), read(JS_WTJS),
                          "if(document.readyState!=='loading'){try{document.dispatchEvent(new Event('DOMContentLoaded'));}catch(e){}}"]),
    }
    js_all = "\n".join([js_parts["he"], js_parts["wt"], js_parts["app"]])
    logo = ""
    if os.path.exists(LOGO):
        logo = "data:image/png;base64," + base64.b64encode(open(LOGO, "rb").read()).decode()
    body = body.replace("__HE_LOGO__", logo)

    # ===== shell dashboard-mmj (sidebar + konten) =====
    nav_he = (
        '<nav class="nav" id="heNav">'
        '<a href="#heChartPanel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V9m5 10V5m5 14v-7m5 7V8"/></svg>Grafik HE</a>'
        '<a href="#wtChartPanel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10m5 10V4m5 16v-7m5 7V8"/></svg>Grafik WT</a>'
        '<a href="#heReviewUnit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>Review Unit HE</a>'
        '<a href="#wt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3s6 6.4 6 10.2A6 6 0 0 1 6 13.2C6 9.4 12 3 12 3Z"/></svg>Review Penyiraman WT</a>'
        '<a href="#heBelum"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M9 2h6v4H9z"/><path d="M11 11h4M11 15h3"/></svg>List Timesheet</a>'
        '</nav>')
    shell_open = ('<div class="app">'
                  '<aside class="side">'
                  '<div class="logo"><img src="' + logo + '" alt="Logo PT. Musi Mitra Jaya">'
                  '<div class="nm">Dashboard MMJ</div></div>'
                  + nav_he +
                  '<button class="theme" id="heTheme" type="button">Tema: terang</button>'
                  '</aside>'
                  '<main class="mmj-main">')
    shell_close = '</main></div>'
    theme_js = """
<script data-mmj-out="assets/js/tab/he-theme.js" data-mmj-mode="app">
(function(){
  var b=document.getElementById('heTheme'); if(!b) return;
  var apply=function(dark){
    if(dark) document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    b.textContent = dark? 'Tema: gelap' : 'Tema: terang';
    try{ localStorage.setItem('heTheme', dark?'dark':'light'); }catch(e){}
  };
  b.addEventListener('click', function(){ apply(document.documentElement.getAttribute('data-theme')!=='dark'); });
  try{ if(localStorage.getItem('heTheme')==='dark') apply(true); }catch(e){}
})();
</script>
"""
    body = shell_open + body + shell_close + theme_js
    return (body, css + "\n" + theme, js_all,
            json.dumps(summary, ensure_ascii=False, separators=(",", ":")), js_parts)


# ------------------------------------------------------------------ nav + shell
_IC_HE = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
          '<path d="M4 19V9m5 10V5m5 14v-7m5 7V8"/></svg>')


def patch_nav(shell_html):
    """Tambah item menu Timesheet HE pada BAR_HTML di dalam shell."""
    old = '<div class="mlbl">Monitoring</div>'
    new = old + ('\n            <a href="#tab=he" data-mmjtab="he">' + _IC_HE + 'Heavy Equipment</a>')
    if 'data-mmjtab="he"' in shell_html:
        return shell_html
    # BAR_HTML ada di dalam template (bukan di shell script) -> ada di tiap template
    return shell_html.replace(old, new)


def patch_shell_js(txt):
    """Daftarkan tab 'he' di shell: map template, mount(), regex hash, fallback."""
    txt = txt.replace('lt: asFrag(document.getElementById("mmjT_lt"))',
                      'lt: asFrag(document.getElementById("mmjT_lt")), he: asFrag(document.getElementById("mmjT_he"))')
    txt = txt.replace('var key = (tab === "batu" || tab === "haul" || tab === "exec") ? tab : "lt";',
                      'var key = (tab === "batu" || tab === "haul" || tab === "exec" || tab === "he") ? tab : "lt";')
    txt = txt.replace('key = ["exec","haul","batu","lt"].filter', 'key = ["exec","haul","batu","lt","he"].filter')
    txt = txt.replace('/tab=(exec|haul|batu|lt|rf)/', '/tab=(exec|haul|batu|lt|rf|he)/')
    txt = txt.replace('if(["exec","haul","batu","lt","rf"].indexOf(tab) < 0) tab = "exec";',
                      'if(["exec","haul","batu","lt","rf","he"].indexOf(tab) < 0) tab = "exec";')
    txt = txt.replace('if(!T.exec && !T.haul && !T.batu && !T.lt){', 'if(!T.exec && !T.haul && !T.batu && !T.lt && !T.he){')
    return txt


# ------------------------------------------------------------------ Monitoring: HE
HE_SECTION_HTML = '''
  <div class="sec" id="ex-he">Heavy Equipment &middot; Water Truck</div>
  <section class="grid">
    <div class="card c8">
      <div class="ch"><div><h2>Kinerja unit HE</h2><p id="pHe"></p></div><button class="open" type="button" data-go="he">Buka Heavy Equipment &#8595;</button></div>
      <div id="cHe"></div>
    </div>
    <div class="card c4">
      <div class="ch"><div><h2>Water Truck</h2><p id="pHeWt"></p></div><button class="open" type="button" data-go="he">Buka &#8595;</button></div>
      <div id="cHeWt"></div>
    </div>
  </section>
'''

HE_SECTION_JS = '''
<script data-mmj-out="assets/js/tab/exec-he.js" data-mmj-mode="app">
/* Ringkasan Timesheet HE + Water Truck untuk Dashboard Monitoring */
(function(){
  var H = (typeof window.mmjData === "function") ? window.mmjData("he") : null;
  var pHe = document.getElementById("pHe"), cHe = document.getElementById("cHe");
  var pHeWt = document.getElementById("pHeWt"), cHeWt = document.getElementById("cHeWt");
  if(!pHe || !cHe) return;
  if(!H){ pHe.textContent = "Data Timesheet HE tidak tersedia"; cHe.innerHTML = '<div class="empty">Data tidak tersedia</div>'; return; }
  var nf0 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:0});
  var nf1 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:1,minimumFractionDigits:1});
  var nf2 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:2,minimumFractionDigits:2});
  var fmt = function(v){ return nf0.format(v||0); };
  var dec1 = function(v){ return nf1.format(v||0); };
  var dec2 = function(v){ return nf2.format(v||0); };
  var mg = function(items){ return '<div class="mg">' + items.map(function(it){
      return '<div><span>'+it[0]+'</span><b>'+it[1]+'</b>'+(it[2]?'<em>'+it[2]+'</em>':'')+'</div>'; }).join("") + '</div>'; };

  pHe.textContent = "Periode " + H.meta.periode + " \\u00b7 " + H.unit + " unit HE (tanpa WT) \\u00b7 data per " + H.meta.generated;
  var vendorRows = H.vendor.map(function(v){
      return '<tr><td><b>'+v.v+'</b></td><td class="r">'+v.unit+'</td><td class="r">'+dec1(v.hm)+'</td><td class="r">'+dec1(v.ma)+'%</td><td class="r">'+fmt(v.fuel)+'</td></tr>'; }).join("");
  var top = H.rows.slice().sort(function(a,b){ return b.hm-a.hm; }).slice(0,5).map(function(r){
      return '<tr><td><b>'+r.u+'</b></td><td>'+(r.v||'-')+'</td><td class="r">'+dec1(r.hm)+'</td><td class="r">'+dec1(r.ma)+'%</td><td class="r">'+dec1(r.pa)+'%</td></tr>'; }).join("");
  cHe.innerHTML =
      mg([["Total HM", nf1.format(H.hm)+"<small>jam</small>", H.unit+" unit"],
          ["Rata-rata MA", dec1(H.ma)+"%", "Mechanical Availability"],
          ["Rata-rata PA", dec1(H.pa)+"%", "Physical Availability"],
          ["Total Fuel", fmt(H.fuel)+"<small>L</small>", "liter terpakai"],
          ["Rata-rata Fuel Ratio", dec2(H.ratio), "liter / jam"]]) +
      '<div class="ttl2">Per vendor</div><table><thead><tr><th>Vendor</th><th class="r">Unit</th><th class="r">HM (jam)</th><th class="r">MA</th><th class="r">Fuel (L)</th></tr></thead><tbody>' + vendorRows + '</tbody></table>' +
      '<div class="ttl2">5 unit dengan HM tertinggi</div><table><thead><tr><th>Unit</th><th>Vendor</th><th class="r">HM</th><th class="r">MA</th><th class="r">PA</th></tr></thead><tbody>' + top + '</tbody></table>';

  var wt = H.wt.slice().sort(function(a,b){ return b.p-a.p; });
  var wtTop = wt.slice(0,5).map(function(w){
      return '<tr><td><b>'+w.u+'</b></td><td>'+(w.v||'-')+'</td><td class="r">'+fmt(w.p)+'</td><td class="r">'+dec1(w.ma)+'%</td></tr>'; }).join("");
  pHeWt.textContent = H.wtUnit + " unit WT \\u00b7 total penyiraman " + fmt(H.penyiraman) + " rit";
  cHeWt.innerHTML =
      mg([["Penyiraman", fmt(H.penyiraman)+"<small>rit</small>", H.wtUnit+" unit WT"],
          ["Ketersediaan Unit", fmt(H.totalUnit), "HE + WT"],
          ["Unit belum lengkap", fmt(H.belumUnit), "timesheet HE"]]) +
      '<div class="ttl2">Penyiraman tertinggi</div><table><thead><tr><th>Unit</th><th>Vendor</th><th class="r">Penyiraman</th><th class="r">MA</th></tr></thead><tbody>' + wtTop + '</tbody></table>';
})();
</script>
'''


def patch_exec(tpl):
    """Sisipkan bagian HE ke dalam template mmjT_exec (copy, file sumber tidak diubah)."""
    if 'id="ex-he"' in tpl:
        return tpl
    marker = '  <div class="note" id="eNote"></div>'
    if marker not in tpl:
        marker = '<div class="note" id="eNote"></div>'
        tpl = tpl.replace(marker, HE_SECTION_HTML + marker)
    else:
        tpl = tpl.replace(marker, HE_SECTION_HTML + marker)
    # script pen-render HE: sisipkan sebelum </template>
    tpl = tpl.replace("</template>", HE_SECTION_JS + "</template>")
    return tpl


def main():
    # ---- 0) padatkan data inline di halaman yang dipublikasikan
    # (shell + 3 halaman terpisah) supaya data mentah tidak ditulis 2x.
    # Dilakukan DI AWAL supaya shell yang dibaca build selalu dalam bentuk
    # ringkas -> versi build (?v=) stabil antar hari.
    spec3 = importlib.util.spec_from_file_location("inline_data", os.path.join(TOOLS, "inline_data.py"))
    inliner = importlib.util.module_from_spec(spec3)
    spec3.loader.exec_module(inliner)
    published = [SRC_SHELL,
                 os.path.join(GAB, "batu-split.html"),
                 os.path.join(GAB, "coal-hauling.html"),
                 os.path.join(GAB, "loss-time.html")]
    inline_before = inline_after = 0
    for p in published:
        ch, b, c = inliner.compact_inline(p)
        inline_before += b
        inline_after += c

    shell = read(SRC_SHELL)
    summary = build_summary()
    body, css, js_all, summary_json, js_parts = build_he_template(summary)

    # logo seragam untuk semua template (gambar yang sama seperti tab Heavy
    # Equipment: assets/logo-mmj.png)
    logo_mmj = ""
    if os.path.exists(LOGO):
        logo_mmj = "data:image/png;base64," + base64.b64encode(open(LOGO, "rb").read()).decode()
    shell = shell.replace("__LOGO_MMJ__", logo_mmj)

    # 1) patch shell JS (daftar template + tab)
    shell = patch_shell_js(shell)

    # 2) ambil 4 template lama (verbatim) + patch exec
    tpls = {}
    for key in ("exec", "haul", "batu", "lt"):
        m = re.search(r'<template id="mmjT_%s">.*?</template>' % key, shell, re.S)
        if not m:
            raise SystemExit("template mmjT_%s tidak ditemukan" % key)
        tpls[key] = m.group(0)
        # Logo lama tertanam di template; pakai logo HE yang sama.
        # Ganti semua gambar logo: template lama menaruh class pada wrapper
        # .badge, bukan pada elemen img.
        tpls[key] = re.sub(r'(<div class="logo">.*?<img\b[^>]*src=")[^"]+', r'\1' + logo_mmj, tpls[key], flags=re.S)
        tpls[key] = re.sub(r'(<img\b[^>]*class="(?:plogo|header-logo)"[^>]*src=")[^"]+', r'\1' + logo_mmj, tpls[key])
        tpls[key] = re.sub(r'(<img\b[^>]*src=")[^"]+("[^>]*class="(?:plogo|header-logo)")', r'\1' + logo_mmj + r'\2', tpls[key])
        # Hapus pembungkus badge dan aturan responsif lama; selector logo HE
        # harus menang pada desktop dan mobile.
        tpls[key] = tpls[key].replace('.logo .badge{display:grid;place-items:center;width:100%}', '.logo .badge{display:contents}')
        tpls[key] = tpls[key].replace('</style>', '''
/* HE sidebar parity: layout, logo, menu, tema */
.app{display:grid;grid-template-columns:236px minmax(0,1fr);gap:22px;max-width:1500px;margin:0 auto;padding:20px}
.side{position:sticky;top:20px;height:calc(100vh - 40px);padding:20px 14px;display:flex;flex-direction:column;gap:4px;border-radius:24px}
.logo{display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 4px 18px;text-align:center}
.logo img{display:block;height:80px;width:auto}
.logo .nm{font-size:10.5px;font-weight:600;letter-spacing:.16em;text-transform:uppercase}
.nav a{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;font-weight:500;font-size:13.5px}
.nav svg{width:18px;height:18px;flex:none}
.theme{margin-top:auto;border-radius:10px;padding:7px 10px;font-size:12px}
</style>''', 1)
        tpls[key] = tpls[key].replace('.logo .badge{width:auto;padding:6px 12px;border-radius:12px}', '.logo .badge{display:contents}')
        tpls[key] = tpls[key].replace('.logo .badge{width:auto}', '.logo .badge{display:contents}')
        tpls[key] = re.sub(r'\.logo img\{height:46px\}', '.logo img{display:block;height:80px;width:auto}', tpls[key])
    tpls["exec"] = patch_exec(tpls["exec"])

    # nav: ganti/link eksternal "../index.html" -> tab internal "#tab=he"
    nav_item = ('\n            <a href="#tab=he" data-mmjtab="he">' + _IC_HE + 'Heavy Equipment</a>')
    ext_item = re.compile(r'\s*<a href="\.\./index\.html">.*?</a>')
    for k in ("exec", "haul", "batu", "lt"):
        tpls[k] = ext_item.sub("", tpls[k])
        if 'data-mmjtab="he"' not in tpls[k]:
            tpls[k] = tpls[k].replace('<div class="mlbl">Monitoring</div>',
                                      '<div class="mlbl">Monitoring</div>' + nav_item)

    # 3) susun template HE dengan format yang sama seperti build_gabungan.py
    he_head = ('<title data-mmj-head>Dashboard Timesheet HE - MMJ November 2026</title>'
               '<style data-mmj-head>%s</style>' % css)
    spec = importlib.util.spec_from_file_location("mmj_gen", os.path.join(TOOLS, "build_gabungan.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    bar_html = mod.BAR_HTML.replace("__GEN__", summary["meta"]["generated"])
    bar_html = re.sub(r'\s*<a href="\.\./index\.html">.*?</a>', "", bar_html)
    # label "Menu halaman" tetap dipakai (tab HE punya menu halaman sendiri)
    bar_html = bar_html.replace('<div class="mlbl">Monitoring</div>',
                                '<div class="mlbl">Monitoring</div>' + nav_item)
    bar_js = mod.BAR_JS

    he_tpl = ('<template id="mmjT_he">\n' + he_head + "\n" + "\n" + bar_html + "\n"
              + body + "\n"
              + '<script data-mmj-out="assets/data/standar-he.js" data-mmj-mode="std">\n'
              + js_parts["std"] + "\n</script>\n"
              + '<script data-mmj-out="assets/data/he.js" data-mmj-mode="he-rows">\n'
              + js_parts["he"] + "\n</script>\n"
              + '<script data-mmj-out="assets/data/wt.js" data-mmj-mode="wt">\n'
              + js_parts["wt"] + "\n</script>\n"
              + '<script data-mmj-out="assets/js/tab/he.js" data-mmj-mode="he-app">\n'
              + js_parts["app"] + "\n</script>\n"
              + bar_js + "\n"
              + '<script data-mmj-out="assets/data/he-summary.js" data-mmj-mode="summary">'
              + 'const DATA = ' + summary_json + ';\n</script>'
              + "</template>")

    # 4) ganti blok template di shell dengan versi baru (exec + haul + batu + lt + he)
    matches = list(re.finditer(r'<template id="mmjT_\w+">.*?</template>', shell, re.S))
    if not matches:
        raise SystemExit("blok template tidak ditemukan di " + SRC_SHELL)
    start, end = matches[0].start(), matches[-1].end()
    block = "\n".join([tpls["exec"], tpls["haul"], tpls["batu"], tpls["lt"], he_tpl])
    shell = shell[:start] + block + shell[end:]

    # 5) pecah menjadi situs modular: index.html + assets/css + assets/js + assets/data
    spec2 = importlib.util.spec_from_file_location("emit_site", os.path.join(TOOLS, "emit_site.py"))
    emitter = importlib.util.module_from_spec(spec2)
    spec2.loader.exec_module(emitter)
    info = emitter.emit(shell, ROOT)

    print("Selesai : %s  (%.1f KB markup)" % (info["index"], info["size"] / 1024))
    st = info.get("stats") or {}
    print("Aset    : assets/css, assets/data, assets/js"
          "  ( tulis %d, tetap %d, hapus %d )"
          % (st.get("written", 0), st.get("unchanged", 0), st.get("removed", 0)))

    # ---- 6) ringkasan pemadatan data inline
    print("Inline  : data inline di %d halaman, %.0f KB -> %.0f KB (hemat %.0f%%)"
          % (len(published), inline_before / 1024, inline_after / 1024,
             100 * (1 - inline_after / max(1, inline_before))))

    # ---- 7) data HE/WT PER BULAN (untuk pemilih bulan di tab Heavy Equipment)
    bulan_ada = []
    for kind, folder, target in (("he", "data-bulanan", "MMJ_HE"),
                                 ("wt", "wt-bulanan", "MMJ_WT")):
        src_dir = os.path.join(ROOT, "js", folder)
        if not os.path.isdir(src_dir):
            continue
        for nama in sorted(os.listdir(src_dir)):
            if not nama.endswith(".json"):
                continue
            mm = os.path.splitext(nama)[0]
            d = json.load(open(os.path.join(src_dir, nama), encoding="utf-8"))
            rel = "assets/data/%s-%s.js" % (kind, mm)
            lines = ["/* %s - data %s bulan %s (dibuat otomatis oleh build). */\n"
                     % (rel, kind.upper(), mm),
                     "window.%s = window.%s || {};\n" % (target, target),
                     "window.%s.PERIODE = %s;\n" % (target, json.dumps(d.get("PERIODE") or {})),
                     emitter._decoder_js()]
            for key in ("DATA", "DAILY", "BELUM", "DAILYUNIT"):
                if key not in d:
                    continue
                lit = json.dumps(d[key], ensure_ascii=False, separators=(",", ":"))
                res = emitter._compact_literal(lit)
                val = "window.MMJ_INFLATE(%s)" % res[0] if res else lit
                if key == "DAILYUNIT":
                    lines.append("window.DAILYUNIT = %s;\n" % val)
                else:
                    lines.append("window.%s.%s = %s;\n" % (target, key, val))
            emitter._write(os.path.join(ROOT, rel), "".join(lines))
            if kind == "he" and mm.isdigit():
                bulan_ada.append(int(mm))
    # daftar bulan yang tersedia (dipakai pemilih bulan di sidebar)
    bulan_ada = sorted(set(bulan_ada))
    print("Bulan   : data HE/WT per bulan untuk %s" % (bulan_ada or "-"))
    print("Tab     : exec | haul | batu | lt | rf | he")
    print("HE      : %d unit HE, %d unit WT, HM %s jam, MA %s%%, Penyiraman %s rit"
          % (summary["unit"], summary["wtUnit"], summary["hm"], summary["ma"], summary["penyiraman"]))


if __name__ == "__main__":
    main()
