"""Uji patch_script(): nama berkas $outFile harus dipertahankan, folder diganti."""
import re
import sys

sys.path.insert(0, r"D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan")
import export_he_bulanan as e  # noqa: E402

OUT = r"D:\Temp\wa_timesheet\bulan\11"
hasil = {}
for nama in ("export_unit_detail.ps1", "export_daily_unit.ps1"):
    txt = e.patch_script(nama, 11, 2026, r"X:\base",
                         [("GIP H2", r"X:\a.xlsx")], [], OUT, None)
    m = re.search(r'(?m)^\$outFile\s*=\s*"(.*)"$', txt)
    hasil[nama] = m.group(1) if m else None

gagal = []
if hasil["export_unit_detail.ps1"] != OUT + r"\unit_detail.json":
    gagal.append("unit_detail: %r" % hasil["export_unit_detail.ps1"])
if hasil["export_daily_unit.ps1"] != OUT + r"\daily_unit.json":
    gagal.append("daily_unit: %r" % hasil["export_daily_unit.ps1"])
if "export_unit_detail.ps1" not in e.SCRIPTS:
    gagal.append("export_unit_detail.ps1 belum ada di SCRIPTS")

for k, v in hasil.items():
    print("%-26s -> %s" % (k, v))
for g in gagal:
    print("GAGAL:", g)
print("HASIL:", "LULUS" if not gagal else "GAGAL (%d)" % len(gagal))
sys.exit(0 if not gagal else 1)
