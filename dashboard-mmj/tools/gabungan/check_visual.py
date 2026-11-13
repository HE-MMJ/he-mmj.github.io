"""Penjaga regresi tampilan: bandingkan screenshot tiap dashboard dengan baseline.

Jalankan dari folder tools/gabungan:
    python check_visual.py               # bandingkan dengan baseline (ambang 0,5%)
    python check_visual.py --info        # hanya laporkan persentase, tidak gagal
    python check_visual.py --max 1.0     # ubah ambang
    python check_visual.py --make-baseline   # buat ulang baseline

Yang dijaga: TEMA TERANG tiap dashboard tidak boleh berubah karena refactor
CSS/design system. Tiap halaman diambil 2x untuk memastikan halamannya stabil
(chart/animasi bisa membuat screenshot tidak deterministik).
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
BASE = os.path.join(HERE, ".visual-baseline")
TMP = tempfile.mkdtemp(prefix="mmj-visual-")
PROBE = os.path.join(ROOT, "_visual_probe.html")

TABS = ["exec", "haul", "batu", "lt", "he"]
WIDTHS = [(1280, 760), (430, 860)]

# Skrip bekukan waktu: halaman menampilkan waktu relatif ("2 jam lalu") yang
# berubah tiap menit -> screenshot jadi tidak deterministik. Waktu dibekukan
# supaya perbandingan piksel benar-benar mengukur perubahan tampilan.
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


def make_probe():
    """Salinan index.html + skrip bekukan waktu (disajikan dari root repo)."""
    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    out = src.replace("</head>", FREEZE + "</head>", 1)
    with open(PROBE, "w", encoding="utf-8") as f:
        f.write(out)
    return "_visual_probe.html"



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


def shot(chrome, url, w, h, out):
    pdir = os.path.join(TMP, "p%d" % random.randint(1, 999999))
    cmd = [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
           "--user-data-dir=" + pdir, "--hide-scrollbars",
           "--window-size=%d,%d" % (w, h), "--virtual-time-budget=9000",
           "--screenshot=" + out, url]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    finally:
        shutil.rmtree(pdir, ignore_errors=True)
    return os.path.exists(out)


def diff_pct(a_path, b_path, mask_path=None):
    """Persen piksel berbeda antara dua PNG.

    `mask_path` = gambar hitam-putih area yang "bergeser" (animasi); area itu
    diabaikan supaya perbandingan mengukur perubahan tata letak, bukan
    pergerakan animasi.
    """
    from PIL import Image, ImageChops
    a = Image.open(a_path).convert("RGB")
    b = Image.open(b_path).convert("RGB")
    if a.size != b.size:
        return 100.0
    d = ImageChops.difference(a, b)
    gray = d.convert("L").point(lambda v: 255 if v > 8 else 0)
    if mask_path and os.path.exists(mask_path):
        noise = Image.open(mask_path).convert("L")
        if noise.size != gray.size:
            noise = noise.resize(gray.size)
        gray = ImageChops.subtract(gray, noise)
    changed = sum(gray.histogram()[255:])
    total = a.size[0] * a.size[1]
    return 100.0 * changed / total


def noise_mask(p1, p2, out):
    """Area yang berubah antara dua screenshot build yang sama (animasi)."""
    from PIL import Image, ImageChops, ImageFilter
    a = Image.open(p1).convert("RGB")
    b = Image.open(p2).convert("RGB")
    if a.size != b.size:
        return False
    d = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 8 else 0)
    if d.getbbox() is None:
        return False
    # perbesar area sedikit supaya tepi animasi juga diabaikan
    d = d.filter(ImageFilter.MaxFilter(7))
    d.save(out)
    return True



def main():
    args = sys.argv[1:]
    info_only = "--info" in args
    make = "--make-baseline" in args
    max_pct = 0.5
    if "--max" in args:
        try:
            max_pct = float(args[args.index("--max") + 1])
        except (IndexError, ValueError):
            print("GAGAL: --max butuh angka"); return 1

    chrome = find_chrome()
    if not chrome:
        print("GAGAL: Chrome/Edge tidak ditemukan."); return 1

    os.makedirs(BASE, exist_ok=True)
    probe = make_probe()
    port = 0
    s = __import__("socket").socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base_url = "http://127.0.0.1:%d" % port
    time.sleep(0.4)

    try:
        if make:
            n = 0
            for tab in TABS:
                for (w, h) in WIDTHS:
                    out = os.path.join(BASE, "%s-%d.png" % (tab, w))
                    # ambil 2x: yang kedua dipakai (CSS tab sudah termuat & stabil)
                    shot(chrome, "%s/%s?nointro=1#tab=%s" % (base_url, probe, tab), w, h,
                         out + ".1")
                    shot(chrome, "%s/%s?nointro=1#tab=%s" % (base_url, probe, tab), w, h, out)
                    for junk in (out + ".1",):
                        try:
                            os.remove(junk)
                        except OSError:
                            pass
                    n += 1
            print("baseline dibuat: %d screenshot di %s" % (n, BASE))
            return 0

        if not os.path.isdir(BASE) or not os.listdir(BASE):
            print("GAGAL: baseline belum ada -> jalankan dulu: python check_visual.py --make-baseline")
            return 1

        worst = 0.0
        unstable = []
        over = []
        for tab in TABS:
            for (w, h) in WIDTHS:
                name = "%s-%d.png" % (tab, w)
                ref = os.path.join(BASE, name)
                cur = os.path.join(TMP, name)
                cur2 = os.path.join(TMP, name + ".2")
                mask = os.path.join(TMP, name + ".mask.png")
                # 2x: capture kedua yang dipakai (CSS tab sudah stabil), selisih
                # keduanya jadi mask (area animasi/bergeser).
                shot(chrome, "%s/%s?nointro=1#tab=%s" % (base_url, probe, tab), w, h, cur2)
                if not shot(chrome, "%s/%s?nointro=1#tab=%s" % (base_url, probe, tab), w, h, cur):
                    print("  GAGAL  %s: screenshot gagal" % name); over.append(name); continue
                # area yang bergerak (animasi) diabaikan -> diff mengukur perubahan tampilan
                noise_mask(cur, cur2, mask) if os.path.exists(cur2) else None
                pct = diff_pct(ref, cur, mask) if os.path.exists(ref) else 100.0
                worst = max(worst, pct)
                flag = "OK"
                if pct > max_pct:
                    flag = "LEBIH BESAR dari ambang"
                    over.append(name)
                print("  %-16s %6.2f%%  %s" % (name, pct, flag))
    finally:
        httpd.shutdown()
        shutil.rmtree(TMP, ignore_errors=True)
        try:
            os.remove(PROBE)
        except OSError:
            pass

    print("")
    if unstable:
        print("CATATAN: halaman tidak stabil (chart/animasi): %s" % ", ".join(unstable))
    if over and not info_only:
        print("GAGAL: %d tampilan melewati ambang %.2f%% (terbesar %.2f%%)" % (len(over), max_pct, worst))
        for o in over:
            print("  - " + o)
        return 1
    print("OK: tampilan tidak berubah (terbesar %.2f%%, ambang %.2f%%)" % (worst, max_pct))
    return 0


if __name__ == "__main__":
    sys.exit(main())
