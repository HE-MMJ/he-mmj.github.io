from pathlib import Path

p = Path(__file__).with_name('build_gabungan_he.py').read_text(encoding='utf-8')
assert "var KEY='mmjTheme';" in p
assert "localStorage.getItem('dashTheme3') || localStorage.getItem('heTheme')" in p
assert "localStorage.setItem(KEY,dark?'dark':'light')" in p
assert "window.addEventListener('storage'" in p
print('OK: HE theme uses shared key and storage sync')
