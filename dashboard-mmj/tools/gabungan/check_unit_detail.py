"""Periksa invarian data panel detail unit.

Pakai: python check_unit_detail.py <unit_detail.json> <js/data-bulanan/MM.json>
Keluar 0 = lulus.
"""
import json
import sys


def udkey(s):
    return "".join(c for c in str(s).upper() if c.isalnum())


detail = json.load(open(sys.argv[1], encoding="utf-8"))
bulan = json.load(open(sys.argv[2], encoding="utf-8"))
data = bulan["DATA"]
err = []

# 1. bentuk dasar + rincian breakdown harus berjumlah sama dengan total
for k, v in detail.items():
    if k != udkey(v["u"]):
        err.append("%s: kunci tidak sama dengan udkey(u)" % k)
    if len(v["c"]) != 13:
        err.append("%s: kategori %d, harus 13" % (k, len(v["c"])))
    total_bd = v["c"]["rep"] + v["c"]["bd"]
    jml = sum(b["h"] for b in v["b"])
    if abs(jml - total_bd) > 0.15:
        err.append("%s: rincian %.1f != repair+bd %.1f" % (k, jml, total_bd))

# 2. cakupan: setiap unit HE di tabel harus punya entri
#    (kecuali yang memang tidak punya sheet di file vendor)
tanpa = [x["Unit"] for x in data if udkey(x["Unit"]) not in detail]
if len(tanpa) > 1 or (tanpa and tanpa[0] != "TRADO-02 GIP H2"):
    err.append("unit tanpa detail: %s" % tanpa)

# 3. label tidak boleh menyisakan awalan 'breakdown'/'repair'
for k, v in detail.items():
    for b in v["b"]:
        if b["l"].startswith(("breakdown", "break down", "repair")):
            err.append("%s: label belum dinormalkan: %s" % (k, b["l"]))

print("unit detail: %d | unit tabel: %d | tanpa detail: %s"
      % (len(detail), len(data), tanpa or "-"))
for e in err[:20]:
    print("GAGAL:", e)
print("HASIL:", "LULUS" if not err else "GAGAL (%d)" % len(err))
sys.exit(0 if not err else 1)
