"""Uji lapisan data di browser sungguhan (Chrome headless).

Tujuan: memastikan decoder JS (MMJ_INFLATE) di file data menghasilkan nilai
yang PERSIS sama dengan decoder Python.

Cara kerja: halaman probe memuat file data yang sama seperti dashboard
memuatnya (<script src="assets/data/....js">), lalu menghitung sidik jari
(hash) hasilnya dan mengirimkannya lewat POST; Python membandingkan dengan
hasil decode Python.

Catatan: ini murni menguji lapisan data. Perilaku aplikasinya (tabel,
grafik, perhitungan turunan) diuji terpisah oleh check_visual.py.

Jalankan dari folder tools/gabungan:
    python check_data_browser.py
"""
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
import emit_site                                   # noqa: E402
from data_codec import inflate                     # noqa: E402

TMP = tempfile.mkdtemp(prefix="mmj-data-test-")
fails = []

# tab -> (file data yang dimuat, nama variabel yang dibaca)
TABS = {
    "haul":  (["assets/data/haul.js"],  "MMJ_DATA.haul"),
    "batu":  (["assets/data/batu.js"],  "MMJ_DATA.batu"),
    "lt":    (["assets/data/lt.js"],    "MMJ_DATA.lt"),
    "he":    (["assets/data/he.js"],    "MMJ_HE"),
    "exec":  (["assets/data/haul.js", "assets/data/batu.js",
               "assets/data/lt.js", "assets/data/he-summary.js"], "MULTI"),
}


def check(name, ok, detail=""):
    if ok:
        print("  PASS  " + name)
    else:
        print("  FAIL  " + name + ("  <- " + detail if detail else ""))
        fails.append(name)


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def find_chrome():
    for c in (r"C:\Program Files\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
              r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"):
        if os.path.exists(c):
            return c
    return None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n).decode("utf-8", "replace") if n else ""
        name = self.path.split("/")[-1] or "hasil"
        with open(os.path.join(TMP, name + ".result"), "w", encoding="utf-8") as f:
            f.write(body)
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/__probe/"):
            name = self.path.split("/__probe/")[1].split("?")[0]
            p = os.path.join(TMP, name)
            if os.path.isfile(p):
                body = open(p, "rb").read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
        super().do_GET()

    def log_message(self, *a):
        pass


# --------------------------------------------------------------- sidik jari --
def js_num(v):
    """Format angka ala JavaScript (biar sama persis dengan browser)."""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int):
        return str(v)
    f = float(v)
    if f != f or f in (float("inf"), float("-inf")):
        return "null"
    if f.is_integer() and abs(f) < 1e21:
        return str(int(f))
    av = abs(f)
    if av != 0 and (av >= 1e21 or av < 1e-6):
        m, e = ("%e" % f).split("e")
        mant = m.rstrip("0").rstrip(".")
        ei = int(e)
        return "%se%s%d" % (mant, "+" if ei >= 0 else "-", abs(ei))
    return repr(f)


def sig(v):
    """Sidik jari struktur (urutan kunci diabaikan)."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return js_num(v)
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, list):
        return "[" + ",".join(sig(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + sig(v[k])
                              for k in sorted(v.keys())) + "}"
    return "null"


def h32(s):
    h = 0x811C9DC5
    for b in s.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


# ------------------------------------------------------------------ probe ----
PROBE = """<!doctype html><meta charset="utf-8"><title>probe data</title>
%(scripts)s
<script>
function sig(v){
  if (v===null || v===undefined) return "null";
  var t=typeof v;
  if (t==="number") return isFinite(v)?String(v):"null";
  if (t==="boolean") return v?"true":"false";
  if (t==="string") return JSON.stringify(v);
  if (Array.isArray(v)){ var a=[],i; for(i=0;i<v.length;i++) a.push(sig(v[i])); return "["+a.join(",")+"]"; }
  var ks=Object.keys(v).sort(), out=[], k;
  for (var j=0;j<ks.length;j++){ k=ks[j]; out.push(JSON.stringify(k)+":"+sig(v[k])); }
  return "{"+out.join(",")+"}";
}
function h32(s){
  var bytes=new TextEncoder().encode(s), h=0x811C9DC5;
  for (var i=0;i<bytes.length;i++){ h^=bytes[i]; h=Math.imul(h,0x01000193)>>>0; }
  return h;
}
function send(){
  try{
    var o = %(collect)s;
    var s = sig(o);
    fetch("/__result/%(name)s",{method:"POST",body:JSON.stringify({len:s.length,hash:h32(s)})});
  }catch(e){
    fetch("/__result/%(name)s",{method:"POST",body:JSON.stringify({error:String(e)})});
  }
}
if (document.readyState === "complete") send();
window.addEventListener("load", function(){ setTimeout(send, 500); });
</script>
"""


def run_probe(chrome, base, tab, wait_ms=40000):
    files, target = TABS[tab]
    scripts = "\n".join('<script src="/%s"></script>' % f for f in files)
    if target == "MULTI":
        collect = ('{haul:(window.MMJ_DATA||{}).haul, batu:(window.MMJ_DATA||{}).batu,'
                   ' lt:(window.MMJ_DATA||{}).lt, he:(window.MMJ_DATA||{}).he}')
    else:
        collect = "window." + target
    name = "data_%s" % tab
    html = PROBE % {"scripts": scripts, "collect": collect, "name": name}
    with open(os.path.join(TMP, name + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    url = base + "/__probe/" + name + ".html"
    pdir = os.path.join(TMP, "prof-" + tab)
    cmd = [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
           "--user-data-dir=" + pdir, "--hide-scrollbars", "--window-size=1280,760",
           "--virtual-time-budget=20000", "--dump-dom", url]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       timeout=240)
    finally:
        shutil.rmtree(pdir, ignore_errors=True)
    rp = os.path.join(TMP, name + ".result")
    deadline = time.time() + wait_ms / 1000.0
    while time.time() < deadline:
        if os.path.exists(rp):
            time.sleep(0.3)
            try:
                return json.loads(open(rp, encoding="utf-8").read())
            except Exception:
                return {"error": "hasil tidak bisa dibaca"}
        time.sleep(0.3)
    return {"error": "tidak ada hasil dari browser"}


# ------------------------------------------------- data diharapkan (Python) --
def read_built_data(fname, target):
    p = os.path.join(ROOT, "assets", "data", fname)
    s = open(p, encoding="utf-8").read()
    m = re.search(r"window\.MMJ_DATA\[\"%s\"\]\s*=" % target, s)
    if not m:
        return None
    j = s.index("{", m.end() - 1)
    end = emit_site._find_literal(s, j)
    val = json.loads(s[j:end + 1])
    return inflate(val) if "MMJ_INFLATE(" in s[m.start():m.end() + 20] else val


def read_built_he():
    p = os.path.join(ROOT, "assets", "data", "he.js")
    s = open(p, encoding="utf-8").read()
    he = {}
    for name in ("DATA", "DAILY", "BELUM"):
        m = re.search(r"window\.MMJ_HE\.%s\s*=" % name, s)
        if not m:
            continue
        j = s.index("{", m.end() - 1)
        end = emit_site._find_literal(s, j)
        val = json.loads(s[j:end + 1])
        he[name] = inflate(val) if "MMJ_INFLATE(" in s[m.start():m.end() + 20] else val
    return he


def expected(tab):
    if tab == "he":
        return read_built_he()
    if tab == "exec":
        return {"haul": read_built_data("haul.js", "haul"),
                "batu": read_built_data("batu.js", "batu"),
                "lt": read_built_data("lt.js", "lt"),
                "he": read_built_data("he-summary.js", "he")}
    return read_built_data("%s.js" % tab, tab)


def main():
    chrome = find_chrome()
    if not chrome:
        print("GAGAL: Chrome/Edge tidak ditemukan")
        return 1
    port = free_port()
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:%d" % port

    try:
        for tab in TABS:
            res = run_probe(chrome, base, tab)
            if res.get("error"):
                check("tab %s: browser melaporkan error" % tab, False, res["error"])
                continue
            exp = expected(tab)
            s = sig(exp)
            same = (res.get("len") == len(s)) and (res.get("hash") == h32(s))
            check("tab %-4s hasil decode JS = decode Python (len %s, hash %s)"
                  % (tab, res.get("len"), res.get("hash")),
                  same,
                  "d_expect len=%d hash=%s" % (len(s), h32(s)))
    finally:
        srv.shutdown()
        shutil.rmtree(TMP, ignore_errors=True)

    print("")
    if fails:
        print("GAGAL: %d pemeriksaan tidak lolos." % len(fails))
        return 1
    print("OK: decoder JS di browser identik dengan decoder Python.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
