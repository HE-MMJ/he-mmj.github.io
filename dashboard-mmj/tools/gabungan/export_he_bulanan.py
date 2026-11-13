"""Export data HE & WT untuk SEMUA bulan (folder produksi di share).

Memakai skrip export yang sudah ada (tidak diubah isinya): skripnya disalin
lalu dipatch per bulan ($base, daftar file vendor, $BULAN/$TAHUN, berkas fuel,
dan folder output). Hasil tiap bulan disimpan di:

    D:\\Temp\\wa_timesheet\\bulan\\<NN>\\*.json

Jalankan: python export_he_bulanan.py            (semua bulan)
          python export_he_bulanan.py 11         (hanya November)
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
WB = os.path.join(os.environ["USERPROFILE"], "Documents", "WB SBL Report")
SHARE = r"\\Engineering\01. engineering mmj\9. MMJ 2026\02. MMJ Report\01. Daily Report"
INPUT = os.path.join(SHARE, "04. Time Sheet HE Report", "01. Input Data")
FUEL = os.path.join(SHARE, "05. Fuel Report")
OUTROOT = r"D:\Temp\wa_timesheet\bulan"

BULAN_NAMA = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
              "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

HE_VENDOR = [("GIP H2", "01"), ("GIP H1", "02"), ("JTU", "03"),
             ("BDK", "04"), ("SKN", "05")]
WT_VENDOR = [("WT TSA", "06", "WT TSA"), ("WT TLK", "07", "WT TLK"),
             ("WT ASA", "08", "WT ASA"), ("WT FBS", "09", "WT FBS"),
             ("WT TJP", "10", "TJP"), ("WT PBT", "11", "WT PBT")]

SCRIPTS = ["export_review.ps1", "export_daily.ps1", "export_daily_unit.ps1",
           "export_belum_review.ps1", "export_wt_penyiraman.ps1"]


def pick(folder, bulan, tahun, must=None):
    """File timesheet bulan penuh dengan revisi tertinggi."""
    if not os.path.isdir(folder):
        return None
    cands = []
    for f in os.listdir(folder):
        low = f.lower()
        if not low.endswith(".xlsx") or f.startswith("~$"):
            continue
        if "(backup" in low or " copy" in low or "01-25" in f:
            continue
        if "1-25" in low.replace(" ", ""):
            continue
        cands.append(f)
    if must:
        cands = [f for f in cands if must.lower() in f.lower()] or cands
    pref = [f for f in cands
            if re.search(r"periode\s*%s\s*%d" % (BULAN_NAMA[bulan - 1], tahun), f, re.I)]

    def key(f):
        m = re.search(r"R_?(\d+)", f, re.I)
        try:
            mt = os.path.getmtime(os.path.join(folder, f))
        except OSError:
            mt = 0
        return (int(m.group(1)) if m else -1, mt)

    pool = pref or cands
    if not pool:
        return None
    return os.path.join(folder, max(pool, key=key))


def subs(folder):
    """Peta prefix '01.' -> nama folder vendor."""
    if not os.path.isdir(folder):
        return {}
    out = {}
    for d in os.listdir(folder):
        m = re.match(r"(\d{2})\.\s", d)
        if m and os.path.isdir(os.path.join(folder, d)):
            out[m.group(1)] = d
    return out


def fuel_file(bulan, tahun):
    """File rekap fuel terbaru untuk bulan itu."""
    for d in os.listdir(FUEL):
        if d.startswith("%02d." % bulan) and os.path.isdir(os.path.join(FUEL, d)):
            return pick(os.path.join(FUEL, d), bulan, tahun, must="solar")
    return None


def patch_script(name, bulan, tahun, base, he_files, wt_files, outdir, fuel):
    """Salin skrip lalu ganti $base/$files/$BULAN/fuel/output."""
    src = os.path.join(WB, name)
    text = open(src, encoding="utf-8-sig").read()

    def blk(var, entries, fmt):
        return "%s = @(\n" % var + ",\n".join(fmt(v) for v in entries) + "\n)"

    # base (nama variabel beda: $base / $BASE)
    text = re.sub(r'(?m)^\$base\s*=\s*".*"$', lambda m: '$base = "%s"' % base, text)
    text = re.sub(r'(?m)^\$BASE\s*=\s*".*"$', lambda m: '$BASE = "%s"' % base, text)
    # daftar file
    if "$FILES" in text:
        repl = blk("$FILES", wt_files,
                   lambda v: '  @{ folder = \'%s\'; path = "%s" }' % (v[0], v[1]))
        text = re.sub(r'(?ms)^\$FILES\s*=\s*@\(.*?^\s*\)', lambda m, r=repl: r,
                      text, count=1)
    if re.search(r"(?ms)^\$files\s*=\s*@\(", text):
        repl = blk("$files", he_files,
                   lambda v: '  @{ Vendor=\'%s\'; Path="%s" }' % (v[0], v[1]))
        text = re.sub(r'(?ms)^\$files\s*=\s*@\(.*?^\s*\)', lambda m, r=repl: r,
                      text, count=1)
    # bulan / tahun
    text = re.sub(r"(?m)^\$BULAN\s*=\s*\d+", "$BULAN = %d" % bulan, text)
    text = re.sub(r"(?m)^\$TAHUN\s*=\s*\d+", "$TAHUN = %d" % tahun, text)
    # fuel
    if fuel:
        text = re.sub(r'(?m)^\$fuelFile\s*=\s*".*"$', lambda m: '$fuelFile = "%s"' % fuel, text)
    # output & temp dir
    text = text.replace('"D:\\Temp\\wa_timesheet\\review_export.json"',
                        '"%s\\review_export.json"' % outdir.replace("\\", "\\\\"))
    text = text.replace('"D:\\Temp\\wa_timesheet\\daily_export.json"',
                        '"%s\\daily_export.json"' % outdir.replace("\\", "\\\\"))
    text = re.sub(r'(?m)^\$tmpDir\s*=\s*".*"$', lambda m: '$tmpDir = "%s"' % outdir, text)
    text = re.sub(r'(?m)^\$outFile\s*=\s*".*"$', lambda m: '$outFile = "%s\\daily_unit.json"' % outdir, text)
    text = re.sub(r'(?m)^\$OUTFILE\s*=\s*".*"$', lambda m: m.group(0), text)  # placeholder
    text = text.replace('D:\\Temp\\wa_timesheet\\belum_grid.json',
                        "%s\\belum_grid.json" % outdir)
    text = text.replace('D:\\Temp\\wa_timesheet\\wt_penyiraman.json',
                        "%s\\wt_penyiraman.json" % outdir)
    return text


def main():
    only = int(sys.argv[1]) if len(sys.argv) > 1 else None
    tahun_default = 2026
    months = []
    for d in os.listdir(INPUT):
        m = re.match(r"(\d{2})\.\s", d)
        if m and os.path.isdir(os.path.join(INPUT, d)):
            bulan = int(m.group(1))
            ym = re.search(r"(\d{4})", d)
            months.append((bulan, int(ym.group(1)) if ym else tahun_default))
    months.sort()
    if only:
        months = [m for m in months if m[0] == only]

    tmpdir = tempfile.mkdtemp(prefix="mmj-he-export-")
    for bulan, tahun in months:
        base = os.path.join(INPUT, "%02d. %s %d" % (bulan, BULAN_NAMA[bulan - 1], tahun))
        if not os.path.isdir(base):
            print("[LEWATI] %s tidak ada" % base)
            continue
        sd = subs(base)
        he_files, wt_files = [], []
        for vendor, pref in HE_VENDOR:
            folder = os.path.join(base, sd.get(pref, "")) if pref in sd else None
            f = pick(folder, bulan, tahun) if folder else None
            if f:
                he_files.append((vendor, f))
            else:
                print("   [kosong] %s %s" % (vendor, base))
        for vendor, pref, must in WT_VENDOR:
            folder = os.path.join(base, sd.get(pref, "")) if pref in sd else None
            f = pick(folder, bulan, tahun, must=must) if folder else None
            if f:
                wt_files.append((vendor, f))
        outdir = os.path.join(OUTROOT, "%02d" % bulan)
        os.makedirs(outdir, exist_ok=True)
        fuel = fuel_file(bulan, tahun)
        print("\n=== %02d. %s %d : %d file HE, %d file WT, fuel %s" % (
            bulan, BULAN_NAMA[bulan - 1], tahun, len(he_files), len(wt_files),
            os.path.basename(fuel) if fuel else "-"))
        for name in SCRIPTS:
            if name == "export_wt_penyiraman.ps1" and not wt_files:
                print("   lewati %s (tidak ada file WT)" % name)
                continue
            txt = patch_script(name, bulan, tahun, base, he_files or [("GIP H2", "")],
                               wt_files, outdir, fuel)
            p = os.path.join(tmpdir, "%02d_%s" % (bulan, name))
            with open(p, "w", encoding="utf-8") as f:
                f.write(txt)
            r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
                                "-File", p], capture_output=True, text=True, timeout=1800)
            last = [l for l in (r.stdout or "").splitlines() if l.strip()][-1:] or \
                   [l for l in (r.stderr or "").splitlines() if l.strip()][-1:]
            print("   %-28s exit=%s  %s" % (name, r.returncode, last[0][:110] if last else ""))
    shutil.rmtree(tmpdir, ignore_errors=True)
    print("\nSelesai. Output: %s" % OUTROOT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
