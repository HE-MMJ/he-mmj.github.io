"""Uji encoder data ringkas.

Untuk setiap sumber data (dashboard-mmj/index.html + js/data.js):
  1. round-trip : compact -> inflate harus PERSIS sama dengan aslinya
  2. hemat     : bentuk ringkas harus lebih kecil dari JSON biasa

Jalankan: python test_data_codec.py
"""
import json
import os
import re
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
import emit_site                                   # noqa: E402
from data_codec import compact, inflate, is_compact   # noqa: E402

ROOT = os.path.abspath(os.path.join(TOOLS, "..", "..", ".."))   # D:\Timesheet\Dashboard
GAB = os.path.join(ROOT, "dashboard-mmj")
SHELL = os.path.join(GAB, "index.html")


def read(p):
    with open(p, encoding="utf-8-sig") as f:
        return f.read()


def literal_after(text, name):
    """Ambil literal (JSON) dari `const <name> = {...};`."""
    got = emit_site._split_const(text, name)
    if not got:
        return None
    lit, _ = got
    try:
        return json.loads(lit)
    except Exception:
        return None


def norm(v):
    return json.dumps(v, sort_keys=True, ensure_ascii=False)


def sources():
    """(nama, objek data) dari semua sumber."""
    out = []
    shell = read(SHELL)
    for tab, body in re.findall(r'<template id="mmjT_(\w+)">(.*?)</template>',
                                shell, re.S):
        g = re.search(r"const\s+DATA\s*=\s*", body)
        if not g:
            continue
        j = g.end()
        while j < len(body) and body[j] != "{":
            j += 1
        try:
            end = emit_site._find_literal(body, j)
            obj = json.loads(body[j:end + 1])
            # sumber bisa sudah dipadatkan (MMJ_INFLATE) -> kembalikan ke bentuk asli
            if is_compact(obj):
                obj = inflate(obj)
            out.append(("tab:" + tab, obj))
        except Exception:
            pass
    he = read(os.path.join(ROOT, "js", "data.js"))
    for name in ("DATA", "DAILY", "BELUM"):
        obj = literal_after(he, name)
        if obj is not None:
            out.append(("he:" + name, obj))
    return out


def main():
    fails = []
    print("%-14s %10s %10s %8s  %s" % ("sumber", "aslinya", "ringkas", "hemat", "round-trip"))
    total_before = total_after = 0
    for name, obj in sources():
        before = len(json.dumps(obj, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
        c = compact(obj)
        small = json.dumps(c, separators=(",", ":"), ensure_ascii=False)
        after = len(small.encode("utf-8"))
        back = inflate(c)
        ok = norm(back) == norm(obj)
        if not ok:
            fails.append(name + ": data berbeda setelah inflate")
        if after >= before:
            fails.append(name + ": bentuk ringkas tidak lebih kecil")
        total_before += before
        total_after += after
        print("%-14s %8.0f KB %8.0f KB %7.0f%%  %s" % (
            name, before / 1024, after / 1024, 100 * (1 - after / before),
            "OK" if ok else "BERBEDA"))
    print("")
    if total_before:
        print("TOTAL: %.0f KB -> %.0f KB (hemat %.0f%%)" % (
            total_before / 1024, total_after / 1024,
            100 * (1 - total_after / total_before)))
    print("")
    if fails:
        print("GAGAL:")
        for f in fails:
            print("  - " + f)
        return 1
    print("OK: encoder无损 - data identik setelah inflate & selalu lebih kecil.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
