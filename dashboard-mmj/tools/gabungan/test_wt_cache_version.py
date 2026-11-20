import hashlib
import importlib.util
import json
from pathlib import Path

root = Path(__file__).resolve().parents[3]
emit_path = Path(__file__).with_name("emit_site.py")
spec = importlib.util.spec_from_file_location("emit_site", emit_path)
emit_site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(emit_site)

html = "unchanged shell"
wt_file = root / "js" / "wt-bulanan" / "11.json"
original = wt_file.read_bytes()
before = emit_site._content_version(html, str(emit_path.parent), "1,2,10,11", str(root))
try:
    data = json.loads(original)
    data["DATA"][0]["TotalPenyiraman"] = data["DATA"][0].get("TotalPenyiraman", 0) + 1
    wt_file.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    after = emit_site._content_version(html, str(emit_path.parent), "1,2,10,11", str(root))
finally:
    wt_file.write_bytes(original)
assert before != after, "WT monthly data change must invalidate published asset URLs"
print("OK: WT monthly data changes cache version")
