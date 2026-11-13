"""
[ARSIP] Sekali pakai - sudah selesai tugasnya (menu Heavy Equipment sudah
terpasang di build_gabungan.py & shell). Disimpan di sini supaya tidak
terlupakan; tidak dipanggil oleh build mana pun.

Sisipkan entri menu "Heavy Equipment" ke grup Monitoring pada:
  - dashboard-mmj/tools/gabungan/build_gabungan.py   (sumber BAR_HTML -> tahan regenerate)
  - dashboard-mmj/index.html                          (shell jadi, nav ada di 4 template)

Tautan ke dashboard Timesheet HE (root repo): ../index.html
"""
import os, re

TOOLS = os.path.dirname(os.path.abspath(__file__))
GAB = os.path.abspath(os.path.join(TOOLS, "..", ".."))
GEN = os.path.join(TOOLS, "build_gabungan.py")
SHELL = os.path.join(GAB, "index.html")

ICON = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
        '<path d="M4 19V9m5 10V5m5 14v-7m5 7V8"/></svg>')
LABEL = "Heavy Equipment"

# item nav lama (label lain) -> dibuang supaya tidak dobel
ITEM_RE = re.compile(r'\s*<a href="\.\./index\.html">.*?</a>')


def read(p):
    with open(p, encoding="utf-8-sig") as f:
        return f.read()


def write(p, s):
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)


def main():
    # 1) generator: ganti label item nav
    g = read(GEN)
    if "Heavy Equipment</a>" not in g:
        g = re.sub(r'(<a href="\.\./index\.html">.*?</svg>)[^<]*</a>', r'\g<1>' + LABEL + '</a>', g, flags=re.S)
        write(GEN, g)
        print("OK  build_gabungan.py  -> label Monitoring = %s" % LABEL)
    else:
        print("SKIP build_gabungan.py  -> sudah ada")

    # 2) shell jadi: buang item nav lama, pasang item baru (1x per template)
    s = read(SHELL)
    n = s.count('<div class="mlbl">Monitoring</div>')
    if n:
        s = ITEM_RE.sub("", s)
        s = s.replace('<div class="mlbl">Monitoring</div>',
                      '<div class="mlbl">Monitoring</div>\n            <a href="../index.html">' + ICON + LABEL + '</a>')
        write(SHELL, s)
        print("OK  dashboard-mmj/index.html -> %d nav Monitoring diperbarui" % n)
    else:
        print("SKIP dashboard-mmj/index.html -> tidak ada nav Monitoring")


if __name__ == "__main__":
    main()
