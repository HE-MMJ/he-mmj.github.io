import json
from pathlib import Path

root = Path(__file__).resolve().parents[3]
source = Path(r"D:\Temp\wa_timesheet\bulan\11\wt_penyiraman.json")
merged = root / "js" / "wt-bulanan" / "11.json"
source_data = json.loads(source.read_text(encoding="utf-8-sig"))
merged_data = json.loads(merged.read_text(encoding="utf-8-sig"))
export_config = Path(__file__).with_name("export_he_bulanan.py").read_text(encoding="utf-8")
assert '("WT PBT", "11", "WT PBT")' in export_config
assert '("SKN", "05", "SKN")' in export_config, "WT SKN missing from monthly export configuration"
assert any(row.get("Vendor") == "SKN" for row in source_data), "WT SKN missing from latest WT export"
assert json.dumps(source_data, sort_keys=True) == json.dumps(merged_data["DATA"], sort_keys=True), (
    "November WT monthly data differs from latest export"
)
print("OK: November WT monthly data matches latest export")
