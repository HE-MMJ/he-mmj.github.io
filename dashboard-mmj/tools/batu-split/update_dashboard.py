"""
Update Dashboard Angkutan Batu Split MMJ.

Membaca file Excel dengan Date modified terbaru di folder Input Daily,
merapikan data transaksi, lalu membuat ulang file
"Dashboard Angkutan Batu Split 2026.html" di folder yang sama.

Cara pakai: klik dua kali "Update Dashboard.bat" (setelah file Excel disimpan).
Bisa juga: python update_dashboard.py "path\\ke\\file.xlsx"
"""
import sys, os, re, glob, json, shutil, tempfile, datetime as dt, warnings
warnings.filterwarnings("ignore")

try:
    import openpyxl
except ImportError:
    print("Library openpyxl belum terpasang. Jalankan:  python -m pip install openpyxl")
    sys.exit(1)

TOOLS = os.path.dirname(os.path.abspath(__file__))
FOLDER = os.path.dirname(TOOLS)
TEMPLATE = os.path.join(TOOLS, "dashboard_template.html")
OUTPUT = os.path.join(FOLDER, "Dashboard Angkutan Batu Split 2026.html")
PATTERN = "*Database Angkutan Batu Split*.xlsx"


def find_source():
    if len(sys.argv) > 1:
        return sys.argv[1]
    # Excel dengan waktu modifikasi (Date modified) terbaru di folder Input Daily
    files = [f for f in glob.glob(os.path.join(FOLDER, "*.xls*"))
             if os.path.splitext(f)[1].lower() in (".xlsx", ".xlsm")
             and not os.path.basename(f).startswith("~$")
             and "copy" not in os.path.basename(f).lower() and "rapi" not in os.path.basename(f).lower()]
    if not files:
        raise SystemExit(f"Tidak ada file Excel (.xlsx) di {FOLDER}")
    def key(f):  # modified terbaru; bila sama, bulan di nama file lalu revisi R terbesar
        name = os.path.basename(f)
        p = re.match(r"(\d{4})\.(\d{2})", name)
        m = re.search(r"R_?(\d+)\.xls[xm]$", name, re.I)
        try:
            mt = int(os.path.getmtime(f))
        except OSError:
            mt = 0
        return (mt, (int(p.group(1)), int(p.group(2))) if p else (0, 0), int(m.group(1)) if m else -1)
    return max(files, key=key)


# ---------------- helpers ----------------
def clean_text(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = " ".join(v.split())
        return None if v in ("", "-", "0", "#N/A") else v
    return v


def to_date(v):
    if isinstance(v, dt.datetime):
        return v
    if isinstance(v, dt.date):
        return dt.datetime(v.year, v.month, v.day)
    return None


def num(v):
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def find_header(ws, must, max_row=15):
    for i, row in enumerate(ws.iter_rows(min_row=1, max_row=max_row, values_only=True), start=1):
        names = [c.strip() if isinstance(c, str) else c for c in row]
        if all(m in names for m in must):
            cols = {}
            for j, n in enumerate(names):  # pakai kolom PERTAMA bila ada nama kembar
                if isinstance(n, str) and n not in cols:
                    cols[n] = j
            return i, cols
    raise SystemExit(f"Header {must} tidak ditemukan di sheet '{ws.title}'")


def read_rows(ws, hdr_row, key_col):
    out, blanks = [], 0
    for r in ws.iter_rows(min_row=hdr_row + 1, values_only=True):
        if len(r) <= key_col or r[key_col] in (None, ""):
            blanks += 1
            if blanks > 50:
                break
            continue
        blanks = 0
        out.append(r)
    return out


WORK_FIX = {"road Maintenance": "Road Maintenance", "Contruction": "Construction"}


def main():
    src = find_source()
    print(f"Membaca : {os.path.basename(src)}")
    # salin dulu supaya tetap bisa dibaca walau file sedang dibuka di Excel
    tmp = os.path.join(tempfile.gettempdir(), "mmj_dash_src.xlsx")
    shutil.copy2(src, tmp)
    wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)

    # ---------- Data Input ----------
    ws = wb["Data Input"]
    hr, H = find_header(ws, ["ID Trans", "Tonage Final", "Class Splite"])
    raw = read_rows(ws, hr, H["ID Trans"])
    g = lambda r, name: r[H[name]] if name in H and H[name] < len(r) else None

    recs, seen = [], {}
    cek = []
    dup_removed = 0
    sig_cols = [n for n in H if n != "No"]
    for r in raw:
        rec = {n: clean_text(g(r, n)) for n in H}
        d = to_date(rec.get("Date Shift Mode"))
        ton = num(rec.get("Tonage Final"))
        if d is None or ton is None:
            cek.append({"no": rec.get("No"), "id": rec.get("ID Trans"), "d": str(rec.get("Date Shift Mode") or ""),
                        "dt": rec.get("No DT"), "jenis": rec.get("Class Splite"), "ton": ton or 0, "area": rec.get("Area"),
                        "msg": "Tanggal/tonase kosong atau bukan angka - tidak dihitung", "hapus": True})
            dup_removed += 1
            continue
        sig = tuple(str(rec.get(n)) for n in sig_cols)
        base = {"no": rec.get("No"), "id": rec.get("ID Trans"), "d": d.strftime("%d-%m-%Y"), "dt": rec.get("No DT"),
                "jenis": rec.get("Class Splite"), "ton": round(ton, 2), "area": rec.get("Area")}
        if sig in seen:
            dup_removed += 1
            cek.append({**base, "msg": f"Duplikat persis dari No {seen[sig]} - tidak dihitung", "hapus": True})
            continue
        seen[sig] = rec.get("No")
        rec["_d"] = d; rec["_ton"] = ton; rec["_base"] = base
        recs.append(rec)

    idcount = {}
    for rec in recs:
        idcount[rec.get("ID Trans")] = idcount.get(rec.get("ID Trans"), 0) + 1

    rows_out = []
    mini_raw = []  # [index baris, tanggal unload, Dumping Location]
    dims = {k: {} for k in ["jenis", "sub", "source", "area", "blok", "kerja", "shift", "vendor", "kategori", "muat", "route", "loader"]}

    def enc(key, v):
        if v is None or v == 0:
            v = "(kosong)"
        v = str(v)
        d = dims[key]
        if v not in d:
            d[v] = len(d)
        return d[v]

    for rec in recs:
        msgs = []
        shift = rec.get("Shift")
        if shift not in ("Day", "Night"):
            t = rec.get("Time Loading")
            shift = "Day" if isinstance(t, dt.time) and 6 <= t.hour < 18 else "Night"
            msgs.append("Shift tidak valid, ditebak dari jam muat")
        if idcount.get(rec.get("ID Trans"), 0) > 1:
            msgs.append("ID Trans dipakai >1 kali")
        if rec["_ton"] > 40:
            msgs.append("Tonase > 40 t (gabungan beberapa DT?)")
        lost = num(rec.get("Lost Tonage")) or 0.0
        if lost > 0:
            msgs.append(f"Lost tonase {lost:.2f} t")
        if rec.get("Area") is None:
            msgs.append("Area kosong")
        if msgs:
            cek.append({**rec["_base"], "msg": ", ".join(msgs), "hapus": False})

        area = rec.get("Area")
        kategori = "Filling Mini Stockpile" if area == "Mini Stockpile" else "Distribusi ke Area"
        work = WORK_FIX.get(rec.get("Type Work"), rec.get("Type Work"))
        muat = (rec.get("Type Muat") or "").capitalize() or None
        km = num(rec.get("Dumping Location"))
        if kategori == "Filling Mini Stockpile":
            # filling mini stockpile: tujuan = kolom Dumping Location, tanggal = Date Unload
            du = to_date(rec.get("Date Unload")) or rec["_d"]
            dst = rec.get("Dumping Location")
            dst = " ".join(str(dst).split()) if dst not in (None, 0) else "(kosong)"
            mini_raw.append([len(rows_out), du.strftime("%Y-%m-%d"), dst])
        rows_out.append([
            rec["_d"].strftime("%Y-%m-%d"),
            enc("jenis", rec.get("Class Splite")), enc("sub", rec.get("MMJ-Splite")), enc("source", rec.get("Source")),
            enc("area", area), enc("blok", rec.get("Section")), enc("kerja", work), enc("shift", shift),
            enc("vendor", rec.get("Vendor")), enc("kategori", kategori), enc("muat", muat), enc("route", rec.get("Route")),
            None if km is None else round(km, 1), round(rec["_ton"], 3), round(lost, 3),
            enc("loader", rec.get("Vendor of Equipment")),
        ])

    # ---------- Rock Received (tongkang) ----------
    tongkang = []
    if "Rock Received" in wb.sheetnames:
        ws = wb["Rock Received"]
        hr, H2 = find_header(ws, ["Code Tongkang", "Tonnage"])
        rows = read_rows(ws, hr, H2["Code Tongkang"])
        start_col = H2.get("Unload")  # Unload Start; Finish ada di kolom sebelahnya
        for x in rows:
            gx = lambda n: x[H2[n]] if n in H2 and H2[n] < len(x) else None
            fin = to_date(x[start_col + 1]) if start_col is not None and start_col + 1 < len(x) else None
            fin = fin or to_date(gx("Unload")) or to_date(gx("Arrived"))
            ton = num(gx("Tonnage"))
            if fin is None or ton is None:
                continue
            tongkang.append({"no": gx("No") or len(tongkang) + 1, "kode": clean_text(gx("Code Tongkang")),
                             "material": clean_text(gx("Material Type")), "jenis": clean_text(gx("Code Material Type")),
                             "tiba": (to_date(gx("Arrived")) or fin).strftime("%Y-%m-%d"), "selesai": fin.strftime("%Y-%m-%d"),
                             "supplier": clean_text(gx("Source")), "barge": clean_text(gx("Barge")),
                             "port": clean_text(gx("Unload Port")), "vol": round(num(gx("Volume")) or 0, 2), "ton": round(ton, 2),
                             "cost": num(gx("Cost")) or 0, "rate": round(num(gx("Rate/ Tonase")) or 0),
                             "dens": round(num(gx("Density")) or 0, 3)})

    # ---------- Stok bulanan (Monthly Summary) ----------
    stock, opening = [], {"port": None, "mini": None}
    if "Monthly Summary" in wb.sheetnames:
        ws = wb["Monthly Summary"]
        hr, H3 = find_header(ws, ["Stock at Port", "Closing Stock"])
        cp, cm = H3["Stock at Port"], H3["Stock at Mini Stockpile"]
        co, cc = H3["Opening Stock"], H3["Closing Stock"]
        for r in ws.iter_rows(min_row=hr + 1, max_row=hr + 40, values_only=True):
            lab = r[1] if len(r) > 1 else None
            if isinstance(lab, str) and lab.strip().lower().startswith("opening"):
                opening = {"port": num(r[cp]), "mini": num(r[cm])}
                continue
            if isinstance(lab, str) and lab.strip().lower() == "total":
                break
            d = to_date(r[2]) if len(r) > 2 else None
            if d is None or d.year < 2000:
                continue
            stock.append({"Bulan": d.strftime("%Y-%m"), "Rock Received (t)": num(r[3]),
                          "Stok Port (t)": num(r[cp]), "Stok Mini Stockpile (t)": num(r[cm]),
                          "Opening (t)": num(r[co]), "Closing (t)": num(r[cc])})

    # ---------- ERM/RIA ----------
    erm_ton, erm_rit = 0.0, 0
    if "BATU ERM_RIA" in wb.sheetnames:
        ws = wb["BATU ERM_RIA"]
        hr, H4 = find_header(ws, ["Tanggal", "Tonage"])
        for r in read_rows(ws, hr, H4["Tanggal"]):
            t = num(r[H4["Tonage"]])
            if t:
                erm_ton += t; erm_rit += 1

    # ---------- Stok per stockpile & jenis batu (tabel ringkas di sheet Daily Summary) ----------
    stockpile = None
    if "Daily Summary" in wb.sheetnames:
        ws = wb["Daily Summary"]
        JN = {"basecoarse": "MMJ-Base Course", "base course": "MMJ-Base Course", "5-7": "MMJ-Splite 5/7", "5/7": "MMJ-Splite 5/7",
              "10-20": "MMJ-Splite 10/20", "10/20": "MMJ-Splite 10/20"}
        def jmap(s):
            s = str(s or "").lower()
            return next((v for k, v in JN.items() if k in s), None)
        ds_month = None
        allrows = list(ws.iter_rows(min_row=1, max_row=ws.max_row or 400, max_col=14, values_only=True))
        for r in allrows[:8]:
            for v in r:
                if to_date(v) and ds_month is None:
                    ds_month = to_date(v).strftime("%Y-%m")
        for i, r in enumerate(allrows):
            if len(r) > 2 and isinstance(r[1], str) and r[1].strip() == "Stockpile" and isinstance(r[2], str) and r[2].strip().upper() == "MMJ":
                sub = allrows[i + 1]
                cols = {}   # owner -> {jenis: col}
                owner = None
                for j in range(2, len(r)):
                    if isinstance(r[j], str) and r[j].strip() and r[j].strip().lower() != "total":
                        owner = r[j].strip()
                    elif isinstance(r[j], str) and r[j].strip().lower() == "total":
                        owner = None
                    jn = jmap(sub[j]) if j < len(sub) else None
                    if owner and jn:
                        cols.setdefault(owner, {})[jn] = j
                items = []
                for rr in allrows[i + 2:i + 30]:
                    name = rr[1] if len(rr) > 1 else None
                    if not isinstance(name, str) or not name.strip():
                        break
                    if name.strip().lower() == "total":
                        break
                    rec = {"name": name.strip(), "own": {}}
                    for own, cmap in cols.items():
                        rec["own"][own] = {jn: round(num(rr[c]) or 0.0, 3) for jn, c in cmap.items()}
                    items.append(rec)
                owners = [o for o in cols if any(abs(v) > 0.0005 for it in items for v in it["own"].get(o, {}).values())]
                if items:
                    stockpile = {"month": ds_month, "owners": owners or ["MMJ"], "items": items}
                break
    wb.close()
    try:
        os.remove(tmp)
    except OSError:
        pass

    # ---------- urutkan kamus (supaya label rapi) ----------
    dims_sorted, remap = {}, {}
    for k, d in dims.items():
        vals = sorted(d, key=lambda s: (s == "(kosong)", s))
        dims_sorted[k] = vals
        remap[k] = {d[v]: i for i, v in enumerate(vals)}
    fields = ["d", "jenis", "sub", "source", "area", "blok", "kerja", "shift", "vendor", "kategori", "muat", "route", "km", "ton", "lost", "loader"]
    for row in rows_out:
        for i, f in enumerate(fields):
            if f in remap:
                row[i] = remap[f][row[i]]
    for need in (["Distribusi ke Area", "Filling Mini Stockpile"], ):
        for v in need:
            if v not in dims_sorted["kategori"]:
                dims_sorted["kategori"].append(v)
    if "Day" not in dims_sorted["shift"]:
        dims_sorted["shift"].append("Day")

    # tujuan filling: ejaan beda huruf besar/kecil (mis. "Stockpile IsP") disatukan ke ejaan yang paling sering
    spell = {}
    for _, _, dst in mini_raw:
        spell.setdefault(dst.upper(), {}).setdefault(dst, 0)
        spell[dst.upper()][dst] += 1
    canon = {u: max(c, key=c.get) for u, c in spell.items()}
    dst_list = sorted(set(canon.values()), key=lambda s: (s == "(kosong)", s))
    dims_sorted["dst"] = dst_list
    mini = [[i, du, dst_list.index(canon[dst.upper()])] for i, du, dst in mini_raw]

    cek.sort(key=lambda c: (not c["hapus"], c["no"] if isinstance(c["no"], (int, float)) else 1e9))
    last = max(r[0] for r in rows_out)
    stock = [s for s in stock if s["Bulan"] <= last[:7]]  # buang bulan yang belum berjalan
    payload = {
        "dims": dims_sorted, "rows": rows_out, "fields": fields, "tongkang": tongkang, "stock": stock,
        "opening": opening, "cek": cek, "stockpile": stockpile, "mini": mini,
        "meta": {"raw": len(raw), "clean": len(rows_out), "dupRemoved": dup_removed,
                 "flagged": sum(1 for c in cek if not c["hapus"]), "lastDate": last,
                 "erm_ton": round(erm_ton, 2), "erm_rit": erm_rit, "source": os.path.basename(src),
                 "generated": dt.datetime.now().strftime("%d-%m-%Y %H:%M")},
    }
    html = open(TEMPLATE, encoding="utf-8").read()
    if "/*DATA*/null" not in html:
        raise SystemExit("Template rusak: penanda /*DATA*/null tidak ditemukan")
    html = html.replace("/*DATA*/null", json.dumps(payload, separators=(",", ":"), ensure_ascii=False))
    logo = os.path.join(TOOLS, "logo_mmj.png")
    if os.path.exists(logo):  # logo disisipkan langsung agar file HTML tetap bisa dikirim sendiri
        import base64
        uri = "data:image/png;base64," + base64.b64encode(open(logo, "rb").read()).decode()
        html = html.replace("__LOGO__", uri)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(html)

    tot = sum(r[13] for r in rows_out)
    print(f"Transaksi : {len(rows_out):,} (dari {len(raw):,} baris, {dup_removed} tidak dihitung)")
    print(f"Data s/d  : {last}")
    print(f"Total     : {tot:,.0f} ton  |  {len(tongkang)} tongkang  |  {sum(1 for c in cek if not c['hapus'])} baris perlu dicek")
    print(f"Selesai   : {os.path.basename(OUTPUT)}")


if __name__ == "__main__":
    main()
