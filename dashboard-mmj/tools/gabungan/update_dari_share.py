"""Update data dashboard MMJ dari folder produksi (share \\Engineering).

Alur:
  1. Jalankan generator yang ada (tidak diubah) untuk Batu Split, Coal Hauling,
     Loss Time -> hasilnya ditulis ke folder CACHE (file produksi tidak ditimpa).
  2. Bentuk <template> masing-masing dashboard (sama seperti build_gabungan.py).
  3. Suntikkan template itu ke shell repo (dashboard-mmj/index.html).
  4. Laporan: tanggal data sebelum vs sesudah.

Sumber data (share produksi):
  Batu Split    : 06. Rock\\01. Input Daily\\*Database Angkutan Batu Split*.xlsx
  Coal Hauling  : 01. Dashboard\\<bulan>\\*Daily Report (Dashboard)*.xlsx  (terbaru by date modified)
  Loss Time     : 03. Rainfall\\<bulan>\\*Info stop Hauling R_*.xlsx

Jalankan: python update_dari_share.py
"""
import contextlib
import datetime as dt
import importlib.util
import io
import os
import re
import shutil
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
GAB = os.path.abspath(os.path.join(TOOLS, "..", ".."))          # dashboard-mmj
SHELL = os.path.join(GAB, "index.html")
CACHE = os.path.join(TOOLS, "cache")

SHARE = r"\\Engineering\01. engineering mmj\9. MMJ 2026\02. MMJ Report\01. Daily Report"

PARTS = {
    "batu": {
        "name": "Batu Split",
        "script": os.path.join(SHARE, "06. Rock", "01. Input Daily", "Dashboard Tools", "update_dashboard.py"),
        "pattern": os.path.join(SHARE, "06. Rock", "01. Input Daily", "*Database Angkutan Batu Split*.xlsx"),
    },
    "haul": {
        "name": "Coal Hauling",
        "script": os.path.join(SHARE, "01. Dashboard", "00. Dashboard Coal Hauling", "Dashboard Tools", "update_dashboard_hauling.py"),
        "pattern": os.path.join(SHARE, "01. Dashboard", "*", "*Daily Report (Dashboard)*.xlsx"),
    },
    "lt": {
        "name": "Loss Time & Rainfall",
        "script": os.path.join(SHARE, "03. Rainfall", "Dashboard Tools", "update_dashboard_losstime.py"),
        "pattern": os.path.join(SHARE, "03. Rainfall", "*", "*Info stop Hauling R_*.xlsx"),
        # generator LT: kalau diberi argumen, HANYA file itu yang dipakai.
        # Tanpa argumen dia memilih revisi terbaru tiap bulan -> riwayat utuh.
        "no_arg": True,
    },
}
ORDER = ["haul", "batu", "lt"]


def newest(pattern):
    """File terbaru (date modified) untuk pola path.

    File kunci Excel (~$...) diabaikan - itu bukan data.
    """
    import glob
    files = [f for f in glob.glob(pattern)
             if os.path.isfile(f) and not os.path.basename(f).startswith("~$")]
    if not files:
        return None
    return max(files, key=lambda f: os.path.getmtime(f))


def run_generator(key, src=None):
    """Jalankan generator produksi; hasilnya ditulis ke CACHE."""
    part = PARTS[key]
    os.makedirs(CACHE, exist_ok=True)
    out = os.path.join(CACHE, "%s.html" % key)
    argv = list(sys.argv)
    if src:
        argv = argv + [src]
    spec = importlib.util.spec_from_file_location("mmj_gen_%s" % key, part["script"])
    mod = importlib.util.module_from_spec(spec)
    buf = io.StringIO()
    old_argv = sys.argv
    # generator menyalin sumber ke file sementara; pakai folder sendiri supaya
    # tidak bentrok dengan file temp yang sedang dipakai proses lain.
    import tempfile
    tmpdir = tempfile.mkdtemp(prefix="mmj_update_")
    old_tmp = tempfile.tempdir
    tempfile.tempdir = tmpdir
    try:
        sys.argv = argv
        with contextlib.redirect_stdout(buf):
            spec.loader.exec_module(mod)
            mod.OUTPUT = out
            mod.main()
    finally:
        sys.argv = old_argv
        tempfile.tempdir = old_tmp
        shutil.rmtree(tmpdir, ignore_errors=True)
    log = [l for l in buf.getvalue().splitlines() if l.strip()]
    return out, log


def build_template(key, html, gen_stamp):
    """Bentuk <template id="mmjT_key"> dari HTML hasil generator."""
    sys.path.insert(0, TOOLS)
    import build_gabungan as bg
    h0, h1 = html.find("<head>"), html.find("</head>")
    head = html[h0 + 6:h1] if h0 >= 0 and h1 > h0 else ""
    heads = re.findall(r"<style\b.*?</style>|<link\b[^>]*>|<title\b.*?</title>", head, re.S)
    heads = [x for x in heads if 'rel="icon"' not in x] + [bg.BAR_CSS]
    heads = [re.sub(r"^<(style|link|title)", r"<\1 data-mmj-head", x) for x in heads]
    b = html.find("<body")
    body = html[html.find(">", b) + 1: html.rfind("</body>")] if b >= 0 else html
    if "</template" in body:
        raise SystemExit("%s: isi dashboard mengandung </template>" % key)
    return ('<template id="mmjT_%s">\n' % key + "\n".join(heads) + "\n"
            + bg.BAR_HTML.replace("__GEN__", gen_stamp) + "\n" + body + "\n" + bg.BAR_JS + "\n</template>")


def main():
    srcs = {}
    for key in ORDER:
        src = newest(PARTS[key]["pattern"])
        if not src:
            print("[GAGAL] %s: tidak ada file sumber (%s)" % (PARTS[key]["name"], PARTS[key]["pattern"]))
            return 1
        srcs[key] = src
        print("[SUMBER] %-20s %s" % (PARTS[key]["name"], src))
        print("         (date modified: %s)" % dt.datetime.fromtimestamp(os.path.getmtime(src)))

    generated = {}
    for key in ORDER:
        print("\n=== jalankan generator %s ===" % PARTS[key]["name"])
        src = None if PARTS[key].get("no_arg") else srcs[key]
        out, log = run_generator(key, src)
        for l in log[-14:]:
            print("   " + l)
        generated[key] = out

    # suntik ke shell repo
    shell = open(SHELL, encoding="utf-8-sig").read()
    gen_stamp = dt.datetime.now().strftime("%d-%m-%Y %H:%M")
    for key in ORDER:
        html = open(generated[key], encoding="utf-8").read()
        tpl = build_template(key, html, gen_stamp)
        pat = re.compile(r'<template id="mmjT_%s">.*?</template>' % key, re.S)
        if not pat.search(shell):
            print("[GAGAL] template mmjT_%s tidak ditemukan di shell" % key)
            return 1
        shell = pat.sub(lambda m: tpl, shell, count=1)
        print("template mmjT_%s diperbarui (%d KB)" % (key, len(tpl.encode()) / 1024))

    tmp = SHELL + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(shell)
    os.replace(tmp, SHELL)
    print("\nShell diperbarui: %s" % SHELL)
    print("Sekarang jalankan: python build_gabungan_he.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
