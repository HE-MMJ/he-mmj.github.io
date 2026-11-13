"""Laporan duplikasi CSS & JS antar dashboard.

Setiap dashboard dibuat oleh generator sendiri (folder produksi, di luar
repo), jadi aturan CSS/JS yang sama ditulis ulang di tiap tab. Duplikasi ini
tidakmemberi beban waktu muat (hanya 1 CSS tab yang dimuat per halaman), tapi
bikin sulit dirawat: mengubah gaya dasar harus di 4-5 tempat.

Alat ini menyortir duplikasi:
  * "aman"  -> blok identik di >1 tab, posisinya sama di semua tab, dan tidak
                ada aturan sesudahnya yang memakai token selector sama.
                Blok seperti ini bisa dipindah ke assets/css/common.css tanpa
                mengubah tampilan (build sudah melakukannya otomatis).
  * "manual"-> duplikasi lain. Perbaikannya di TEMPLATE generator (folder
                produksi), bukan di repo ini - kalau dipindah paksa dari build,
                urutan cascade berubah dan tampilan bisa bergeser.

Jalankan: python check_duplication.py
"""
import os
import re
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
GAB = os.path.join(ROOT, "dashboard-mmj")
SHELL = os.path.join(GAB, "index.html")

sys.path.insert(0, HERE)
import emit_site                                   # noqa: E402
from emit_site import _css_blocks, _css_key, _css_tokens   # noqa: E402


def js_functions(script):
    """Blok fungsi tingkat atas: (nama, teks) untuk 'function NAME(...) {...}'."""
    out = []
    for m in re.finditer(r"\n\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(", script):
        j = script.find("{", m.end())
        if j < 0:
            continue
        depth, k = 0, j
        while k < len(script):
            if script[k] == "{":
                depth += 1
            elif script[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        if k >= len(script):
            continue
        out.append((m.group(1), script[m.start() + 1:k + 1]))
    return out


def main():
    shell = open(SHELL, encoding="utf-8-sig").read()
    tpls = re.findall(r'<template id="mmjT_(\w+)">(.*?)</template>', shell, re.S)

    css_by_tab, js_by_tab = {}, {}
    for tab, body in tpls:
        css_by_tab[tab] = "\n".join(x.strip() for x in
                                    re.findall(r"<style[^>]*>(.*?)</style>", body, re.S))
        js_by_tab[tab] = "\n".join(x for x in
                                  re.findall(r"<script[^>]*>(.*?)</script>", body, re.S))

    # ---------- CSS
    occ = defaultdict(list)
    for tab, css in css_by_tab.items():
        for i, blk in enumerate(_css_blocks(css)):
            occ[_css_key(blk)].append((tab, i))
    dup = {k: v for k, v in occ.items() if len({t for t, _ in v}) > 1}

    safe = set()
    for tab, css in css_by_tab.items():
        blks = _css_blocks(css)
        later = set()
        for i in range(len(blks) - 1, -1, -1):
            blk = blks[i]
            k = _css_key(blk)
            if k in dup and i <= emit_site._CSS_HOIST_MAX_INDEX \
                    and not (_css_tokens(blk) & later):
                safe.add(k)
            later |= _css_tokens(blk)

    print("=== CSS ===")
    print("blok CSS total      : %d" % sum(len(_css_blocks(c)) for c in css_by_tab.values()))
    print("blok identik di >1 tab: %d" % len(dup))
    print("  aman dipindah ke common.css : %d blok" % len(safe))
    print("  perlu diperbaiki di template : %d blok" % (len(dup) - len(safe)))
    if dup:
        print()
        print("contoh duplikasi (manual):")
        shown = 0
        for k, v in dup.items():
            if k in safe or shown >= 12:
                continue
            sel = k.split("{")[0].strip().replace("\n", " ")[:52]
            tabs = ",".join(sorted({t for t, _ in v}))
            print("   %-54s %-22s %5d B" % (sel, tabs, len(k)))
            shown += 1

    # ---------- JS
    occf = defaultdict(list)
    for tab, js in js_by_tab.items():
        for name, blk in js_functions(js):
            occf[re.sub(r"\s+", " ", blk).strip()].append((tab, name))
    dupf = {k: v for k, v in occf.items() if len({t for t, _ in v}) > 1}
    print()
    print("=== JS ===")
    print("fungsi identik di >1 tab: %d" % len(dupf))
    for k, v in list(dupf.items())[:14]:
        names = [n for _, n in v]
        tabs = ",".join(sorted({t for t, _ in v}))
        print("   %-22s %-22s %5d B" % (names[0], tabs, len(k)))
    print()
    print("Catatan: perbaikan permanen dilakukan di TEMPLATE generator")
    print("(folder produksi, di luar repo ini). Build di repo sudah aman")
    print("memindahkan blok CSS bersama yang tidak mengubah urutan cascade.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
