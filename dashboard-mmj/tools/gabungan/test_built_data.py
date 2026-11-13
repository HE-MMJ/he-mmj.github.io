"""Uji regresi lapisan data: data di assets/data/*.js (setelah di-inflate)
harus PERSIS sama dengan data sumber (dashboard-mmj/index.html + js/*.js).

Kalau encoder ringkas mengubah satu nilai pun, test ini gagal.

Jalankan: python test_built_data.py
"""
import json
import os
import re
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
import emit_site                                   # noqa: E402
from data_codec import inflate, is_compact         # noqa: E402

ROOT = os.path.abspath(os.path.join(TOOLS, "..", "..", ".."))   # D:\Timesheet\Dashboard
GAB = os.path.join(ROOT, "dashboard-mmj")
DATA_OUT = os.path.join(ROOT, "assets", "data")
SHELL = os.path.join(GAB, "index.html")


def read(p):
    with open(p, encoding="utf-8-sig") as f:
        return f.read()


def norm(v):
    """Bandingkan dengan urutan kunci yang sama (dict tidak berurutan)."""
    return json.dumps(v, sort_keys=True, ensure_ascii=False)


def extract_json(text, start):
    """Mulai dari posisi 'start' -> teks JSON sampai tertutup, lalu json.loads."""
    end = emit_site._find_literal(text, start)
    return json.loads(text[start:end + 1])


def parse_built(path, pattern):
    """Ambil nilai yang di-assign di file built sesuai regex.

    Mendukung dua bentuk:
      window.MMJ_DATA["x"] = {...};
      window.MMJ_DATA["x"] = window.MMJ_INFLATE({...});
    """
    s = read(path)
    m = re.search(pattern, s)
    if not m:
        return None, False
    j = s.index("{", m.end() - 1)
    obj = extract_json(s, j)
    wrapped = "MMJ_INFLATE(" in s[m.start():m.end() + 20]
    return (inflate(obj) if wrapped else obj), True


def main():
    fails = []
    shell = read(SHELL)
    tpls = dict(re.findall(r'<template id="mmjT_(\w+)">(.*?)</template>', shell, re.S))

    print("== data dashboard (dari shell dashboard-mmj/index.html) ==")
    for tab, body in tpls.items():
        got = re.search(r"const\s+DATA\s*=\s*", body)
        if not got:
            continue
        j = got.end()
        while j < len(body) and body[j] != "{":
            j += 1
        src = extract_json(body, j)
        # sumber boleh sudah dipadatkan (MMJ_INFLATE) -> kembalikan ke bentuk asli
        if is_compact(src):
            src = inflate(src)
        p = os.path.join(DATA_OUT, "%s.js" % tab)
        if not os.path.exists(p):
            fails.append("%s: file built tidak ada (%s)" % (tab, p))
            continue
        built, found = parse_built(p, r"window\.MMJ_DATA\[\"%s\"\]\s*=" % tab)
        if not found:
            fails.append("%s: assignment MMJ_DATA tidak ditemukan di %s" % (tab, p))
            continue
        same = norm(built) == norm(src)
        size = os.path.getsize(p) / 1024.0
        print("  %-6s %-14s %8.1f KB  n=%-6s  %s" % (
            tab, os.path.basename(p), size,
            len(src) if hasattr(src, "__len__") else "-",
            "SAMA" if same else "BERBEDA!"))
        if not same:
            fails.append("%s: data hasil build berbeda dari sumber" % tab)

    print("== data HE (dari js/data.js) & WT (dari js/wt-data.js) ==")
    he_src = read(os.path.join(ROOT, "js", "data.js"))
    for name in ("DATA", "DAILY", "BELUM"):
        got = emit_site._split_const(he_src, name)
        if not got:
            continue
        lit, _ = got
        src = json.loads(lit)
        built, found = parse_built(
            os.path.join(DATA_OUT, "he.js"),
            r"window\.MMJ_HE\.%s\s*=" % name)
        if not found:
            fails.append("he: %s tidak ditemukan di assets/data/he.js" % name)
            continue
        same = norm(built) == norm(src)
        print("  HE.%-6s %-14s %8.1f KB  n=%-6s  %s" % (
            name, "he.js", os.path.getsize(os.path.join(DATA_OUT, "he.js")) / 1024.0,
            len(src) if hasattr(src, "__len__") else "-",
            "SAMA" if same else "BERBEDA!"))
        if not same:
            fails.append("he.%s: data hasil build berbeda dari sumber" % name)

    wt_src = read(os.path.join(ROOT, "js", "wt-data.js"))
    wt_built = read(os.path.join(DATA_OUT, "wt.js"))
    for name, key in (("WT_PERIODE", "PERIODE"), ("WT_DATA", "DATA")):
        got = emit_site._split_const(wt_src, name)
        if not got:
            continue
        lit, _ = got
        # data WT ditulis sebagai literal JS (kunci tanpa tanda kutip) -> bandingkan teks
        m = re.search(r"window\.MMJ_WT\.%s\s*=\s*" % key, wt_built)
        if not m:
            fails.append("wt: %s tidak ditemukan di assets/data/wt.js" % name)
            continue
        j = m.end() - 1
        while j < len(wt_built) and wt_built[j] not in "{[":
            j += 1
        end = emit_site._find_literal(wt_built, j)
        built_lit = wt_built[j:end + 1]
        same = built_lit.strip() == lit.strip()
        print("  WT.%-6s %-14s %8.1f KB  %s" % (
            key, "wt.js", os.path.getsize(os.path.join(DATA_OUT, "wt.js")) / 1024.0,
            "SAMA" if same else "BERBEDA!"))
        if not same:
            fails.append("wt.%s: data hasil build berbeda dari sumber" % name)

    print("")
    if fails:
        print("GAGAL:")
        for f in fails:
            print("  - " + f)
        return 1
    print("OK: semua data hasil build identik dengan sumber (nilai tidak berubah).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
