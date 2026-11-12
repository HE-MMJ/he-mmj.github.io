"""Cek hasil build untuk fitur login Dashboard MMJ.

Jalankan dari folder tools/gabungan:
    python check_login.py
Keluar 0 = semua ada, keluar 1 = ada yang kurang.
"""
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
fails = []


def need(path, must=()):
    """File harus ada; dan harus memuat semua potongan di `must`."""
    p = os.path.join(ROOT, path)
    if not os.path.exists(p):
        fails.append("hilang: " + path)
        return ""
    txt = open(p, encoding="utf-8").read()
    for m in must:
        if m not in txt:
            fails.append("%s: tidak memuat %r" % (path, m))
    return txt


# --- halaman login & sumbernya
need("login.html", ("assets/js/auth.js", 'id="fLogin"', "assets/css/login.css"))
need("assets/js/auth.js", (
    "window.MMJ_AUTH", "login:", "logout:", "current:", "isLoggedIn:", "can:",
    "mmjSession", "mmjRemember",
))
need("assets/css/login.css", (".lg-card", ".lg-err"))
need("assets/css/shell.css", (".mmj-user", ".mmj-user-out"))

# --- index.html: auth.js sebelum shell.js, shell.css ada
idx = need("index.html", ("assets/js/auth.js", "assets/css/shell.css", "assets/js/shell.js"))
if idx:
    a = idx.find("assets/js/auth.js")
    b = idx.find("assets/js/shell.js")
    if a < 0 or b < 0 or a > b:
        fails.append("index.html: auth.js harus dimuat sebelum shell.js")

# --- loader: guard + menu user
need("assets/js/shell.js", ("isLoggedIn", "mmj-user", "location.replace"))

if fails:
    print("GAGAL:")
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("OK: login.html, auth.js, login.css, shell.css, guard & menu user ada.")
