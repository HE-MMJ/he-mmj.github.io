from pathlib import Path

source = Path(__file__).with_name("shell_loader.js").read_text(encoding="utf-8")
assert 'if (!mb && pageTab === "he")' in source
assert 'var list = window.MMJ_BULAN || [];' in source
assert 'mb = list.length ? list[list.length - 1] : 0;' in source
print("OK: standalone HE page defaults to latest available month")
