"""
check_pages.py - verifikasi hasil build berupa halaman terpisah per dashboard.

Halaman yang diharapkan (folder + index.html supaya URL tanpa ekstensi):

    /                     Dashboard Eksekutif   (data-mmj-page="exec")
    /Heavy-Equipment/     Heavy Equipment       (data-mmj-page="he")
    /Coal-Hauling/        Coal Hauling          (data-mmj-page="haul")
    /Batu-Split/          Batu Split            (data-mmj-page="batu")
    /Loss-Time/           Loss Time             (data-mmj-page="lt")
    /Rainfall/            Rainfall              (data-mmj-page="rf", CSS/JS Loss Time)
    /Cost-Control/        Cost Control          (data-mmj-page="cost", hanya setelah login)

Yang diperiksa:
  * halaman utama TIDAK lagi memakai <template id="mmjT_*"> (bukan dashboard gabungan)
  * tiap halaman memuat CSS + data + app dashboard yang benar
  * menu sidebar memakai tautan antar-halaman, bukan #tab=
  * halaman di subfolder memakai awalan ../ untuk aset
  * izin data-mmj-auth tetap ada
  * halaman Cost Control memakai data-mmj-auth-page dan tidak memuat data
"""
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    "..", "..", ".."))

PAGES = [
    # (folder, tab, css_tab, judul-menu)
    ("", "exec", "exec", "Dashboard Eksekutif"),
    ("Heavy-Equipment", "he", "he", "Heavy Equipment"),
    ("Coal-Hauling", "haul", "haul", "Coal Hauling"),
    ("Batu-Split", "batu", "batu", "Batu Split"),
    ("Loss-Time", "lt", "lt", "Loss Time"),
    ("Rainfall", "rf", "lt", "Rainfall"),
    ("Cost-Control", "cost", "cost", "Cost Control"),
    ("Data-Simper", "simper", "simper", "Data Simper"),
    ("Data-DT", "dt", "dt", "Data DT"),
]

NAV = ["Heavy-Equipment/", "Coal-Hauling/", "Batu-Split/", "Loss-Time/",
       "Rainfall/", "Cost-Control/", "Data-Simper/", "Data-DT/"]

# halaman yang hanya terbuka setelah login: folder -> izin
AUTH_PAGES = {"Cost-Control": "costcontrol",
              "Data-Simper": "hse",
              "Data-DT": "hse"}


fails = []


def read(rel):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        fails.append("%s: file tidak ada" % rel)
        return ""
    with open(path, encoding="utf-8") as f:
        return f.read()


def need(rel, items):
    txt = read(rel)
    for it in items:
        if it not in txt:
            fails.append("%s: tidak memuat '%s'" % (rel, it))


# --- halaman utama: Dashboard Eksekutif saja ------------------------------
main = read("index.html")
if '<template id="mmjT_' in main:
    fails.append("index.html: masih memakai <template id=\"mmjT_*\"> (belum jadi halaman tunggal)")
if 'data-mmj-page="exec"' not in main:
    fails.append("index.html: tidak ada data-mmj-page=\"exec\"")
if 'href="#tab=' in main:
    fails.append("index.html: masih ada menu #tab= (harus tautan antar-halaman)")
need("index.html", ['assets/css/exec.css', 'assets/data/', 'assets/js/tab/exec.js',
                    'assets/js/shell.js', 'data-mmj-cap="public"',
                    'data-mmj-cap="hse"', 'data-mmj-cap="costcontrol"'])

# --- tiap halaman ---------------------------------------------------------
for folder, tab, css_tab, label in PAGES:
    rel = os.path.join(folder, "index.html") if folder else "index.html"
    prefix = "../" if folder else ""
    txt = read(rel)
    if not txt:
        continue
    if 'data-mmj-page="%s"' % tab not in txt:
        fails.append("%s: tidak ada data-mmj-page=\"%s\"" % (rel, tab))
    if 'href="#tab=' in txt:
        fails.append("%s: masih ada menu #tab=" % rel)
    if "%sassets/css/%s.css" % (prefix, css_tab) not in txt:
        fails.append("%s: CSS %s.css tidak dimuat dengan awalan '%s'" % (rel, css_tab, prefix))
    if "%sassets/js/shell.js" % prefix not in txt:
        fails.append("%s: shell.js tidak dimuat dengan awalan '%s'" % (rel, prefix))
    for nav in NAV:
        if 'href="%s%s"' % (prefix, nav) not in txt:
            fails.append("%s: menu '%s%s' tidak ada" % (rel, prefix, nav))
    if label not in txt:
        fails.append("%s: label menu '%s' tidak ada" % (rel, label))

    # halaman ber-izin (Cost Control) vs halaman publik
    izin = AUTH_PAGES.get(folder)
    if izin:
        if 'data-mmj-auth-page="%s"' % izin not in txt:
            fails.append("%s: tidak ada data-mmj-auth-page=\"%s\"" % (rel, izin))
        if "%sassets/data/" % prefix in txt:
            fails.append("%s: halaman ber-izin tidak boleh memuat assets/data/" % rel)
    elif "data-mmj-auth-page" in txt:
        fails.append("%s: halaman publik tidak boleh memakai data-mmj-auth-page" % rel)

# --- Cost Control pindah dari halaman Eksekutif ---------------------------
if 'id="ex-cost"' in main:
    fails.append("index.html: bagian #ex-cost masih ada (Cost Control sudah jadi halaman sendiri)")
if 'href="#ex-cost"' in main:
    fails.append("index.html: menu #ex-cost masih ada")
cost = read(os.path.join("Cost-Control", "index.html"))
if cost and "<title>Cost Control" not in cost:
    fails.append("Cost-Control/index.html: <title> bukan Cost Control")

# --- halaman HSE (Data Simper / Data DT) ---------------------------------
for folder, judul in (("Data-Simper", "Data Simper"), ("Data-DT", "Data DT")):
    txt = read(os.path.join(folder, "index.html"))
    if not txt:
        continue
    if "<title>%s" % judul not in txt:
        fails.append("%s/index.html: <title> bukan %s" % (folder, judul))
    if 'data-mmj-auth-page="hse"' not in txt:
        fails.append("%s/index.html: tidak ber-izin hse" % folder)

# --- menu sidebar memakai penanda capability -----------------------------
for folder in ("", "Cost-Control", "Data-Simper", "Data-DT"):
    rel = os.path.join(folder, "index.html") if folder else "index.html"
    txt = read(rel)
    if not txt:
        continue
    for cap in ("public", "hse", "costcontrol"):
        if 'data-mmj-cap="%s"' % cap not in txt:
            fails.append("%s: menu data-mmj-cap=\"%s\" tidak ada" % (rel, cap))

# --- Rainfall memakai view rain -------------------------------------------
rain = read(os.path.join("Rainfall", "index.html"))
if rain:
    if "MMJ_VIEW" not in rain:
        fails.append("Rainfall/index.html: tidak menyetel window.MMJ_VIEW")
    if "MMJ_VIEW" not in read("assets/js/tab/lt.js"):
        fails.append("assets/js/tab/lt.js: belum membaca window.MMJ_VIEW")

# --- aset tidak boleh hilang ---------------------------------------------
for rel in ("assets/css/theme.css", "assets/css/shell.css", "assets/css/common.css",
            "assets/js/shell.js", "assets/js/auth.js", "login.html"):
    if not os.path.exists(os.path.join(ROOT, rel)):
        fails.append("%s: aset hilang" % rel)

if fails:
    print("GAGAL:")
    for f in fails:
        print("  - " + f)
    sys.exit(1)

print("OK: index.html = Dashboard Eksekutif + %d halaman terpisah "
      "(5 monitoring + Cost Control + Data Simper + Data DT)." % (len(PAGES) - 1))
