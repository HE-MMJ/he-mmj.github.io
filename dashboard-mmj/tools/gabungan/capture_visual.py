"""Ambil screenshot semua dashboard (untuk perbandingan manual/otomatis).

Jalankan: python capture_visual.py <folder tujuan>
"""
import os
import random
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
TMP = tempfile.mkdtemp(prefix="mmj-cap-")
PROBE = os.path.join(ROOT, "_capture_probe.html")

TABS = ["exec", "haul", "batu", "lt", "he"]
WIDTHS = [(1280, 760), (430, 860)]

FREEZE = """<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>
<script>
(function(){
  var RealDate = Date, FIXED = 1763000000000;
  function FakeDate(){
    if (arguments.length === 0) return new RealDate(FIXED);
    return new (Function.prototype.bind.apply(RealDate, [null].concat(Array.prototype.slice.call(arguments))))();
  }
  FakeDate.prototype = RealDate.prototype;
  FakeDate.now = function(){ return FIXED; };
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  window.Date = FakeDate;
})();
</script>
"""


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

    def log_message(self, *a):
        pass


def main():
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    with open(PROBE, "w", encoding="utf-8") as f:
        f.write(src.replace("</head>", FREEZE + "</head>", 1))
    chrome = find_chrome()
    s = __import__("socket").socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base_url = "http://127.0.0.1:%d" % port
    time.sleep(0.4)
    n = 0
    try:
        for tab in TABS:
            for (w, h) in WIDTHS:
                out = os.path.join(out_dir, "%s-%d.png" % (tab, w))
                pdir = os.path.join(TMP, "p%d" % random.randint(1, 999999))
                cmd = [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
                       "--user-data-dir=" + pdir, "--hide-scrollbars",
                       "--window-size=%d,%d" % (w, h), "--virtual-time-budget=9000",
                       "--screenshot=" + out,
                       "%s/_capture_probe.html?nointro=1#tab=%s" % (base_url, tab)]
                try:
                    subprocess.run(cmd, stdout=subprocess.DEVNULL,
                                   stderr=subprocess.DEVNULL, timeout=180)
                finally:
                    shutil.rmtree(pdir, ignore_errors=True)
                n += 1
    finally:
        httpd.shutdown()
        shutil.rmtree(TMP, ignore_errors=True)
        try:
            os.remove(PROBE)
        except OSError:
            pass
    print("tersimpan %d screenshot di %s" % (n, out_dir))


if __name__ == "__main__":
    sys.exit(main())
