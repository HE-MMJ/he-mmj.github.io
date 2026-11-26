"""Gabungkan hasil export HE/WT per bulan menjadi data siap-pakai.

Masukan : D:\\Temp\\wa_timesheet\\bulan\\<NN>\\*.json  (dari export_he_bulanan.py)
Keluaran: Dashboard\\js\\data-bulanan\\<NN>.json  (HE)  dan  wt-bulanan\\<NN>.json (WT)

Bentuk keluarannya sama dengan js/data.js & js/wt-data.js yang sudah dipakai
app, ditambah "PERIODE" bulan itu -> app tinggal membaca PERIODE.

Jalankan: python merge_he_bulanan.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))     # D:\Timesheet\Dashboard
SRC = r"D:\Temp\wa_timesheet\bulan"
OUT_HE = os.path.join(ROOT, "js", "data-bulanan")
OUT_WT = os.path.join(ROOT, "js", "wt-bulanan")

# JUMLAH HARI tiap bulan (2026 bukan kabisat)
HARI = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def read_json(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8-sig") as f:
        txt = f.read().strip()
    if not txt:
        return None
    try:
        return json.loads(txt)
    except Exception:
        return None


CAP = r"D:\Temp\wa_timesheet\capacity.json"   # dari export_capacity.ps1 (List Unit)


def apply_capacity(review):
    """Tempel Capacity tiap unit (byUnit lalu byModel) seperti apply_capacity.ps1.

    Wajib karena stdFuel() di app.js butuh Jenis+Capacity untuk mencocokkan
    Tabel 1 SOP; export_review.ps1 tidak menulis Capacity.
    """
    cap = read_json(CAP)
    if not cap:
        print("  (kapasitas dilewati: %s tidak ada)" % CAP)
        return review

    def key(s):
        return re.sub(r"\s+", " ", str(s or "")).strip().upper()

    by_unit, by_type = {}, {}
    for c in cap:
        if c.get("Unit"):
            by_unit.setdefault(key(c.get("Unit")), c.get("Capacity") or "")
        if c.get("UnitLama"):
            by_unit.setdefault(key(c.get("UnitLama")), c.get("Capacity") or "")
        if c.get("Type"):
            by_type.setdefault(key(c.get("Type")), c.get("Capacity") or "")

    n = 0
    for d in review:
        if d.get("Capacity"):
            continue
        cap_val = by_unit.get(key(d.get("Unit"))) or by_type.get(key(d.get("Model"))) or ""
        if cap_val:
            d["Capacity"] = cap_val
            n += 1
    return review


def main():
    os.makedirs(OUT_HE, exist_ok=True)
    os.makedirs(OUT_WT, exist_ok=True)
    months = sorted(d for d in os.listdir(SRC) if re.match(r"^\d{2}$", d)) \
        if os.path.isdir(SRC) else []
    if not months:
        print("GAGAL: tidak ada folder bulan di %s" % SRC)
        return 1
    ok = 0
    for mm in months:
        b = int(mm)
        d = os.path.join(SRC, mm)
        review = read_json(os.path.join(d, "review_export.json"))
        daily = read_json(os.path.join(d, "daily_export.json"))
        belum = read_json(os.path.join(d, "belum_grid.json"))
        unit = read_json(os.path.join(d, "daily_unit.json"))
        detail = read_json(os.path.join(d, "unit_detail.json"))
        wt = read_json(os.path.join(d, "wt_penyiraman.json"))

        if not review:
            print("  %s: lewati (review kosong)" % mm)
            continue
        review = apply_capacity(review)
        he = {
            "PERIODE": {"y": 2026, "m": b, "last": HARI[b - 1]},
            "DATA": review,
            "DAILY": daily or [],
            "BELUM": belum or [],
            "DAILYUNIT": unit or [],
            "UNITDETAIL": detail or {},
        }
        with open(os.path.join(OUT_HE, "%s.json" % mm), "w", encoding="utf-8") as f:
            json.dump(he, f, ensure_ascii=False, separators=(",", ":"))
        if wt:
            wtx = {"PERIODE": {"y": 2026, "m": b, "last": HARI[b - 1]}, "DATA": wt}
            with open(os.path.join(OUT_WT, "%s.json" % mm), "w", encoding="utf-8") as f:
                json.dump(wtx, f, ensure_ascii=False, separators=(",", ":"))
        print("  %s: HE %d unit, DAILY %d, BELUM %d, DAILYUNIT %d, UNITDETAIL %d | WT %d unit" % (
            mm, len(review), len(daily or []), len(belum or []), len(unit or []),
            len(detail or {}), len(wt or [])))
        ok += 1
    print("\nSelesai: %d bulan siap dipakai" % ok)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
