"""
Update Dashboard Coal Hauling PT. Musi Mitra Jaya.

Sumber: file "MMJ Daily Report (Dashboard)" dengan tanggal modifikasi terbaru di
folder bulan terbaru (mis. "11. November 2026") di dalam folder 01. Dashboard.

  * Bulan berjalan H0+H2 : sheet "SBL WB"              (coal diterima di Port SBL)
  * Bulan berjalan H1    : sheet "Input CH CCP - ISP61" (CPP -> ISP61)
  * Tahunan H0 / H2      : sheet "ANNUAL GPU-BKL", tabel
                           "Coal Hauled-Received Cummulative 2026 (Port Received-Based On BA)"
                           H0 = baris Mine-Port, H2 = baris ISP-Port (Periode I + II dijumlah)
  * Tahunan H1           : sheet "ANNUAL GPU-BKL", tabel
                           "Coal Haul Use Partial MMJ Haul Road (CPP GPU-ISP68)" (Periode I + II)
  * Target bulanan mitra : sheet "DAILY HAUL DASHBOARD" (Monthly Plan)

Cara pakai: klik dua kali "Update Dashboard Coal Hauling.bat".
Bisa juga: python update_dashboard_hauling.py "path\\ke\\file.xlsx"
"""
import sys, os, re, glob, json, shutil, tempfile, base64, datetime as dt, warnings
from collections import defaultdict
warnings.filterwarnings("ignore")

try:
    import openpyxl
except ImportError:
    print("Library openpyxl belum terpasang. Jalankan:  python -m pip install openpyxl")
    sys.exit(1)

TOOLS = os.path.dirname(os.path.abspath(__file__))
FOLDER = os.path.dirname(TOOLS)                 # 00. Dashboard Coal Hauling
DASH_ROOT = os.path.dirname(FOLDER)             # 01. Dashboard
TEMPLATE = os.path.join(TOOLS, "hauling_template.html")
LOGO = os.path.join(TOOLS, "logo_mmj.png")
OUTPUT = os.path.join(FOLDER, "Dashboard Coal Hauling 2026.html")
PATTERN = "*Daily Report (Dashboard)*.xlsx"

MITRA = ["GPU", "GE", "TRA", "BSL", "BKL"]
MITRA_NAME = {"GPU": "PT Gorby Putra Utama", "GE": "PT Gorby Energy", "TRA": "PT Triaryani",
              "BSL": "PT Bara Sentosa Lestari", "BKL": "PT Banyan Koalindo Lestari"}


def find_source():
    if len(sys.argv) > 1:
        return sys.argv[1]
    months = []
    for d in os.listdir(DASH_ROOT):
        m = re.match(r"^(\d{1,2})\.\s", d)
        if m and os.path.isdir(os.path.join(DASH_ROOT, d)):
            files = [f for f in glob.glob(os.path.join(DASH_ROOT, d, PATTERN))
                     if not os.path.basename(f).startswith("~$") and "copy" not in os.path.basename(f).lower()]
            if files:
                months.append((int(m.group(1)), files))
    if not months:
        raise SystemExit(f"Tidak ada file '{PATTERN}' di folder bulan dalam {DASH_ROOT}")
    _, files = max(months, key=lambda x: x[0])
    def key(f):  # modified terbaru; bila sama, tanggal di nama file lalu revisi R terbesar
        n = os.path.basename(f)
        d = re.match(r"(\d{4})\.(\d{2})\.(\d{2})", n)
        r = re.search(r"R_?(\d+)", n, re.I)
        try:
            mt = os.path.getmtime(f)
        except OSError:
            mt = 0
        return (int(mt), d.groups() if d else ("", "", ""), int(r.group(1)) if r else -1)
    return max(files, key=key)


def num(v):
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else 0.0


def to_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    return None


def txt(v):
    return " ".join(v.split()) if isinstance(v, str) else ("" if v is None else str(v))


def header(ws, row, must):
    vals = next(ws.iter_rows(min_row=row, max_row=row, values_only=True))
    cols = {}
    for j, n in enumerate(vals):
        if isinstance(n, str):
            n = " ".join(n.split())
            cols.setdefault(n, j)
    miss = [m for m in must if m not in cols]
    if miss:
        raise SystemExit(f"Kolom {miss} tidak ditemukan di sheet '{ws.title}' baris {row}")
    return cols


def block_of(t):
    """Blok 2 jam mode shift: T01 = 06:00-08:00 ... T12 = 04:00-06:00."""
    if isinstance(t, dt.datetime):
        t = t.time()
    if not isinstance(t, dt.time):
        return -1
    return ((t.hour - 6) % 24) // 2


class Route:
    """Agregasi transaksi harian satu route."""
    def __init__(self):
        self.facts = defaultdict(lambda: [0.0, 0])   # (d, m, blk, origin, vendor) -> [ton, trip]
        self.units = defaultdict(set)                # (d, m) -> {unit}
        self.dims = {"origin": [], "vendor": [], "unit": []}

    def idx(self, dim, v):
        L = self.dims[dim]
        v = v or "(kosong)"
        try:
            return L.index(v)
        except ValueError:
            L.append(v)
            return len(L) - 1

    def add(self, d, m, blk, origin, vendor, unit, ton):
        k = (d, m, blk, self.idx("origin", origin), self.idx("vendor", vendor))
        self.facts[k][0] += ton
        self.facts[k][1] += 1
        if unit not in (None, "", "-"):
            self.units[(d, m)].add(self.idx("unit", txt(unit)))

    def dump(self):
        return {
            "facts": [[*k, round(v[0], 2), v[1]] for k, v in sorted(self.facts.items())],
            "units": [[d, m, sorted(u)] for (d, m), u in sorted(self.units.items())],
            "dims": self.dims,
        }


def main():
    src = find_source()
    print(f"Membaca : {os.path.relpath(src, DASH_ROOT)}")
    tmp = os.path.join(tempfile.gettempdir(), "mmj_hauling_src.xlsx")
    shutil.copy2(src, tmp)
    wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)

    # ---------- tanggal laporan & target (DAILY HAUL DASHBOARD) ----------
    ws = wb["DAILY HAUL DASHBOARD"]
    report_date, targets = None, {}
    rows = list(ws.iter_rows(min_row=1, max_row=60, values_only=True))
    for r in rows[:6]:
        for v in r:
            if isinstance(v, dt.datetime) and report_date is None:
                report_date = v.date()
    for i, r in enumerate(rows):
        for j, v in enumerate(r):
            if isinstance(v, str) and v.strip() == "Monthly Plan":
                for back in range(1, 4):           # nama mitra di baris atasnya
                    names = rows[i - back]
                    for k in range(j + 1, len(r)):
                        n = txt(names[k]) if k < len(names) else ""
                        if n in MITRA and isinstance(r[k], (int, float)):
                            targets[n] = float(r[k])
                    if targets:
                        break
        if targets:
            break
    print(f"Target  : {targets or 'tidak ditemukan'}")

    cek = []

    # ---------- bulan berjalan H0+H2 : SBL WB ----------
    ws = wb["SBL WB"]
    H = header(ws, 3, ["Date Unload shift mode", "Time Unload", "Units Code", "Tonnage",
                       "Coal Company", "MMJ Rock", "Product Origin"])
    g = lambda r, n: r[H[n]] if H.get(n) is not None and H[n] < len(r) else None
    raw02 = []
    for r in ws.iter_rows(min_row=4, values_only=True):
        ton = num(g(r, "Tonnage"))
        d = to_date(g(r, "Date Unload shift mode"))
        if ton <= 0 or d is None:
            continue
        raw02.append((d, txt(g(r, "Coal Company")), txt(g(r, "MMJ Rock")), txt(g(r, "Product Origin")),
                      txt(g(r, "vendor")), g(r, "Units Code"), g(r, "Time Unload"), ton))

    # ---------- bulan berjalan H1 : Input CH CCP - ISP61 ----------
    ws = wb["Input CH CCP - ISP61"]
    H = header(ws, 3, ["Date Dumping Shift Mode", "Time Unload", "Units Code", "Tonnage", "Company", "Product Origin"])
    rawH1 = []
    for r in ws.iter_rows(min_row=4, values_only=True):
        ton = num(g(r, "Tonnage"))
        d = to_date(g(r, "Date Dumping Shift Mode"))
        if ton <= 0 or d is None:
            continue
        rawH1.append((d, txt(g(r, "Company")), txt(g(r, "Product Origin")), txt(g(r, "Vendor")),
                      g(r, "Units Code"), g(r, "Time Unload"), ton))

    # bulan berjalan = bulan tanggal laporan (atau bulan data terbanyak)
    all_d = [x[0] for x in raw02] + [x[0] for x in rawH1]
    if report_date is None:
        report_date = max(all_d)
    ym = (report_date.year, report_date.month)
    in_month = lambda d: (d.year, d.month) == ym
    last = max([d for d in all_d if in_month(d)], default=report_date)
    ndays = last.day
    out_month = sum(1 for d in all_d if not in_month(d))
    if out_month:
        cek.append({"lvl": "info", "msg": f"{out_month} baris bertanggal di luar bulan {ym[1]:02d}/{ym[0]} tidak dihitung di bulan berjalan."})

    r02, r1 = Route(), Route()
    unmapped = defaultdict(lambda: [0, 0.0])
    rock = [0, 0.0]
    for d, comp, kind, origin, vendor, unit, tm, ton in raw02:
        if not in_month(d):
            continue
        if kind and kind.lower() != "coal":
            rock[0] += 1; rock[1] += ton
            continue
        if comp not in MITRA:
            k = f"{origin or '(kosong)'} / Coal Company '{comp or '-'}'"
            unmapped[k][0] += 1; unmapped[k][1] += ton
            continue
        r02.add(d.day - 1, MITRA.index(comp), block_of(tm), origin, vendor, unit, ton)
    for k, (n, t) in unmapped.items():
        cek.append({"lvl": "warn", "msg": f"SBL WB: {n} rit ({t:,.2f} t) dengan Product Origin {k} tidak masuk hitungan (bukan mitra coal)."})
    unmappedH1 = defaultdict(lambda: [0, 0.0])
    for d, comp, origin, vendor, unit, tm, ton in rawH1:
        if not in_month(d):
            continue
        if comp not in MITRA:
            unmappedH1[f"{origin or '(kosong)'} / Company '{comp or '-'}'"][0] += 1
            unmappedH1[f"{origin or '(kosong)'} / Company '{comp or '-'}'"][1] += ton
            continue
        r1.add(d.day - 1, MITRA.index(comp), block_of(tm), origin, vendor, unit, ton)
    for k, (n, t) in unmappedH1.items():
        cek.append({"lvl": "warn", "msg": f"Input CH CCP - ISP61: {n} rit ({t:,.2f} t) dengan {k} tidak masuk hitungan."})

    # ---------- tahunan : ANNUAL GPU-BKL ----------
    ws = wb["ANNUAL GPU-BKL"]
    A = list(ws.iter_rows(min_row=1, max_row=min(ws.max_row or 200, 200), max_col=16, values_only=True))
    def find_row(title):
        for i, r in enumerate(A):
            if len(r) > 1 and isinstance(r[1], str) and " ".join(r[1].split()) == title:
                return i
        raise SystemExit(f"Tabel '{title}' tidak ditemukan di sheet ANNUAL GPU-BKL")
    def months_of(r):
        return [round(num(r[3 + k]), 2) if 3 + k < len(r) else 0.0 for k in range(12)]
    def read_table(title):
        """-> {(mitra, label): [12 bulan]}; berhenti di baris 'Total'."""
        out, comp = {}, None
        for r in A[find_row(title) + 1:]:
            b = txt(r[1]) if len(r) > 1 else ""
            c = txt(r[2]) if len(r) > 2 else ""
            if b == "Total":
                break
            if b in MITRA:
                comp = b
            if comp and c and b != "Sub-Total" and c not in ("Sub Total",):
                key = (comp, c)
                vals = months_of(r)
                out[key] = [x + y for x, y in zip(out.get(key, [0] * 12), vals)]
            if comp and (c == "Sub Total" or b == "Sub-Total"):
                out[(comp, "__sub__")] = months_of(r)
        return out

    ba = read_table("Coal Hauled-Received Cummulative 2026 (Port Received-Based On BA)")
    wbt = read_table("Coal Hauled-Received By SBL Port - 2026")
    h1t = read_table("Coal Haul Use Partial MMJ Haul Road (CPP GPU-ISP68)")

    def pick(tbl, comp, word):
        tot = [0.0] * 12
        for (c, lab), v in tbl.items():
            if c == comp and word in lab:
                tot = [a + b for a, b in zip(tot, v)]
        return tot

    annual = {"H0": {}, "H2": {}, "H1": {}, "WB": {}, "detail": []}
    for c in MITRA:
        annual["H0"][c] = [round(x, 2) for x in pick(ba, c, "Mine-Port")]
        annual["H2"][c] = [round(x, 2) for x in pick(ba, c, "ISP-Port")]
        annual["H1"][c] = [round(x, 2) for x in pick(h1t, c, "Periode")]
        annual["WB"][c] = wbt.get((c, "__sub__"), [0.0] * 12)
        for (cc, lab), v in ba.items():
            if cc == c and lab != "__sub__":
                annual["detail"].append(["H0" if "Mine-Port" in lab else "H2", c, lab, v])
        for (cc, lab), v in h1t.items():
            if cc == c and lab != "__sub__":
                annual["detail"].append(["H1", c, lab, v])

    # status per bulan
    cur = ym[1] - 1 if ym[0] == 2026 else -1
    st02, st1 = [], []
    split_seen = False
    for k in range(12):
        h0 = sum(annual["H0"][c][k] for c in MITRA)
        h2 = sum(annual["H2"][c][k] for c in MITRA)
        wbk = sum(annual["WB"][c][k] for c in MITRA)
        if h0 + h2 > 0:
            if h2 == 0 and split_seen:
                st02.append("unsplit")
            else:
                st02.append("ba")
            if h2 > 0:
                split_seen = True
        elif k == cur:
            st02.append("run")
        elif wbk > 0:
            st02.append("wb")
        else:
            st02.append("none")
        h1 = sum(annual["H1"][c][k] for c in MITRA)
        st1.append("ba" if h1 > 0 else ("run" if k == cur else "none"))
    annual["st02"], annual["st1"] = st02, st1
    BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    for k in range(12):
        if st02[k] == "unsplit":
            cek.append({"lvl": "warn", "msg": f"Tabel BA {BLN[k]} 2026: seluruh tonase tercatat di baris Mine-Port, ISP-Port kosong. Ditampilkan sebagai \"H0+H2 belum dipisah\" sampai tabel BA dipisah."})
        if st02[k] == "wb":
            cek.append({"lvl": "info", "msg": f"Tabel BA {BLN[k]} 2026 belum terisi; dipakai angka WB (Port Received)."})
        if k < cur and st1[k] == "none":
            cek.append({"lvl": "warn", "msg": f"Tabel H1 (CPP GPU-ISP68) {BLN[k]} 2026 masih kosong; tonase H1 bulan itu belum tampil."})
        if st02[k] == "ba":
            diff = sum(annual["H0"][c][k] + annual["H2"][c][k] - annual["WB"][c][k] for c in MITRA)
            if abs(diff) > 1:
                cek.append({"lvl": "info", "msg": f"{BLN[k]} 2026: selisih BA - WB = {diff:,.2f} t."})
    if cur >= 0 and st02[cur] == "run":
        wb_cur = sum(annual["WB"][c][cur] for c in MITRA)
        run_cur = sum(v[0] for v in r02.facts.values())
        if wb_cur and abs(wb_cur - run_cur) > 1:
            cek.append({"lvl": "warn", "msg": f"{BLN[cur]} 2026: total SBL WB ({run_cur:,.2f} t) berbeda dengan tabel WB tahunan ({wb_cur:,.2f} t)."})

    # ---------- target RKAP (H0+H2) & H1 = persen x H0+H2 ----------
    rkap_file = os.path.join(TOOLS, "target_rkap.json")
    rkap = {"H02": {}, "H1": {}, "h1Pct": None, "source": None}
    if os.path.exists(rkap_file):
        cfg = json.load(open(rkap_file, encoding="utf-8"))
        pctH1 = float(cfg.get("h1_persen", 85))
        for c in MITRA:
            v = [float(x or 0) for x in cfg.get("H02", {}).get(c, [0] * 12)][:12]
            v += [0.0] * (12 - len(v))
            rkap["H02"][c] = v
            rkap["H1"][c] = [round(x * pctH1 / 100, 2) for x in v]
        rkap["h1Pct"], rkap["source"] = pctH1, "RKAP"
        print(f"Target  : RKAP (target_rkap.json), H1 = {pctH1:g}% x H0+H2")
        cur_rk = {c: rkap["H02"][c][ym[1] - 1] for c in MITRA}
        if targets and any(abs(cur_rk[c] - targets.get(c, 0)) > 1 for c in MITRA):
            cek.append({"lvl": "info", "msg": "Target bulan ini memakai RKAP (" + ", ".join(f"{c} {cur_rk[c]:,.0f}" for c in MITRA)
                        + " t). Monthly Plan di sheet DAILY HAUL DASHBOARD berbeda (" + ", ".join(f"{c} {targets.get(c,0):,.0f}" for c in MITRA) + " t)."})
    else:
        print("Target  : target_rkap.json tidak ada, pakai Monthly Plan DAILY HAUL DASHBOARD")
        for c in MITRA:
            v = [0.0] * 12; v[ym[1] - 1] = targets.get(c, 0.0)
            rkap["H02"][c] = v; rkap["H1"][c] = [x * .85 for x in v]
        rkap["h1Pct"], rkap["source"] = 85.0, "Monthly Plan (sheet DAILY HAUL DASHBOARD)"

    logos = {}
    for c in MITRA:
        p = os.path.join(TOOLS, "logos", c + ".png")
        if os.path.exists(p):
            logos[c] = "data:image/png;base64," + base64.b64encode(open(p, "rb").read()).decode()

    payload = {
        "meta": {
            "source": os.path.basename(src),
            "sourceFolder": os.path.basename(os.path.dirname(src)),
            "sourceModified": dt.datetime.fromtimestamp(os.path.getmtime(src)).strftime("%d/%m/%Y %H:%M"),
            "generated": dt.datetime.now().strftime("%d/%m/%Y %H:%M"),
            "year": ym[0], "month": ym[1], "lastDay": ndays,
            "daysInMonth": (dt.date(ym[0] + ym[1] // 12, ym[1] % 12 + 1, 1) - dt.timedelta(days=1)).day,
            "reportDate": report_date.isoformat(),
            "rock": {"n": rock[0], "t": round(rock[1], 2)},
        },
        "mitra": MITRA, "mitraName": MITRA_NAME, "planExcel": targets, "rkap": rkap, "logos": logos,
        "run": {"H02": r02.dump(), "H1": r1.dump()},
        "annual": annual,
        "cek": cek,
    }

    html = open(TEMPLATE, encoding="utf-8").read()
    if "/*DATA*/null" not in html:
        raise SystemExit("Template rusak: penanda /*DATA*/null tidak ditemukan")
    html = html.replace("/*DATA*/null", json.dumps(payload, separators=(",", ":"), ensure_ascii=False))
    if os.path.exists(LOGO):
        html = html.replace("__LOGO__", "data:image/png;base64," + base64.b64encode(open(LOGO, "rb").read()).decode())
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(html)
    try:
        os.remove(tmp)
    except OSError:
        pass
    t02 = sum(v[0] for v in r02.facts.values()); t1 = sum(v[0] for v in r1.facts.values())
    print(f"Bulan   : {ym[1]:02d}/{ym[0]} s/d tgl {ndays} · H0+H2 {t02:,.2f} t · H1 {t1:,.2f} t")
    print(f"Cek data: {len(cek)} catatan")
    print(f"Selesai : {os.path.basename(OUTPUT)} ({os.path.getsize(OUTPUT)/1024:,.0f} KB)")


if __name__ == "__main__":
    main()
