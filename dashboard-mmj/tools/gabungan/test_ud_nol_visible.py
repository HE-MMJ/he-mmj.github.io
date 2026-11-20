import re
from pathlib import Path

css = Path(__file__).with_name("he_mmj_theme.css").read_text(encoding="utf-8")
m = re.search(r"\.ud-table \.ud-nol \{[^}]*\}", css)
assert m and "opacity" not in m.group(0), "zero-value rows must not rely on opacity (invisible in dark theme)"
assert re.search(r':root\[data-theme="dark"\] \.ud-table \.ud-nol[^{]*\{[^}]*color:[^;]+;', css), (
    "dark theme must set an explicit readable color for zero-value rows"
)
print("OK: zero-value unit-detail rows stay visible in both themes")
