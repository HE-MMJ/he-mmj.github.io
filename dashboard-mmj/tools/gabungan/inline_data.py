"""Kompak data inline pada halaman HTML (`const DATA = {...}`).

Halaman yang dipublikasikan (shell `dashboard-mmj/index.html` + halaman
terpisah batu-split/coal-hauling/loss-time) masih memuat data mentah
(±1,9 MB). Data itu dikompresi dengan encoder yang sama seperti file data
(`data_codec.py`) lalu didekode di browser oleh `MMJ_INFLATE`.

Decoder disisipkan sebagai <script> di dalam <head>, jadi:
  * halaman tetap jalan saat dibuka langsung (file://);
  * halaman tetap bisa dipakai sebagai sumber build (build_gabungan_he.py)
    -> `emit_site` sudah mengenali bentuk `MMJ_INFLATE(...)`.

Fungsi ini idempoten: file yang sudah dipadatkan dilewati.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import emit_site                                   # noqa: E402
from data_codec import compact_json, DECODER_JS, is_compact   # noqa: E402

DECODER_TAG = "<script>\n%s\n</script>" % DECODER_JS.strip()


def compact_inline(path, names=("DATA",)):
    """Kompak `const NAME = {...}` di dalam file HTML.

    Return (berubah, ukuran_sebelum, ukuran sesudah).
    """
    if not os.path.exists(path):
        return False, 0, 0
    with open(path, "rb") as f:
        blob = f.read()
    had_bom = blob[:3] == b"\xef\xbb\xbf"
    raw = blob.decode("utf-8-sig")
    before = len(blob)

    if "MMJ_INFLATE(" in raw:
        return False, before, before        # sudah dipadatkan

    out = raw
    changed = False
    for name in names:
        pat = re.compile(r"(const\s+%s\s*=\s*)(\{)" % re.escape(name))
        pos = 0
        edits = []
        while True:
            m = pat.search(out, pos)
            if not m:
                break
            start = m.start(2)
            try:
                end = emit_site._find_literal(out, start)
            except ValueError:
                pos = m.end()
                continue
            lit = out[start:end + 1]
            try:
                obj = json.loads(lit)
            except Exception:
                pos = m.end()
                continue
            small, used = compact_json(obj)
            if not used:
                pos = m.end()
                continue
            edits.append((start, end + 1, small))
            pos = end + 1
        for s, e, small in reversed(edits):
            out = out[:s] + "MMJ_INFLATE(" + small + ")" + out[e:]
            changed = True

    if not changed:
        return False, before, before

    # decoder supaya halaman bisa mendekompresi sendiri
    if "window.MMJ_INFLATE" not in out:
        i = out.lower().find("<head>")
        if i >= 0:
            j = i + len("<head>")
            out = out[:j] + "\n" + DECODER_TAG + out[j:]

    data = out.encode("utf-8")
    if had_bom:
        data = b"\xef\xbb\xbf" + data
    with open(path, "wb") as f:
        f.write(data)
    return True, before, len(data)


def main():
    import argparse
    ap = argparse.ArgumentParser(description="Kompak data inline pada halaman HTML")
    ap.add_argument("files", nargs="+")
    a = ap.parse_args()
    for p in a.files:
        ch, b, c = compact_inline(p)
        print("%-46s %s  %.0f KB -> %.0f KB" % (
            os.path.basename(p), "dipadatkan" if ch else "sama        ",
            b / 1024, c / 1024))


if __name__ == "__main__":
    main()
