"""
Update Dashboard Loss Time & Curah Hujan MMJ.

Membaca semua file "Info stop Hauling" bulanan di subfolder 03. Rainfall (satu file per bulan:
R_Adjust bila ada, selain itu revisi R_nn tertinggi), lalu membuat ulang
"Dashboard Loss Time & Curah Hujan 2026.html" di folder 03. Rainfall.

Sumber angka:
  - Loss time  : sheet "Input Stop Hauling", kolom "Convert Duration" (sudah direkonsil,
                 duplikat dihapus, angka disesuaikan SOP). Pembagian route dari kolom Route: Jan-Jun H1 & H2 saja, Jul-Des H1 / ISP / H2.
                 Rincian Mitra Company dari kolom "Desc Type2".
  - Curah hujan: sheet "Input TCH", akumulasi per hari per pos (Rainfall mm & Duration Convert jam);
                 PORT SBL dari sheet "RAIN FALL" (kolom rain,hr & rainfall), karena data SBL tidak diinput di Input TCH.
                 KM 124 - KM 75 = H1 · ISP68 = ISP · KM 47 - KM 12 & SBL Port = H2.

Cara pakai: klik dua kali "Update Dashboard Loss Time.bat" (di folder 03. Rainfall) setelah file
Excel disimpan; dashboard langsung terbuka setelah selesai.
Bisa juga:  python update_dashboard_losstime.py "path\\ke\\file.xlsx"
"""
import sys, os, re, glob, json, shutil, tempfile, datetime as dt, warnings, base64
warnings.filterwarnings("ignore")

try:
    import openpyxl
except ImportError:
    print("Library openpyxl belum terpasang. Jalankan:  python -m pip install openpyxl")
    sys.exit(1)

TOOLS = os.path.dirname(os.path.abspath(__file__))
FOLDER = os.path.dirname(TOOLS)                      # ...\03. Rainfall
TEMPLATE = os.path.join(TOOLS, "losstime_template.html")
OUTPUT = os.path.join(FOLDER, "Dashboard Loss Time & Curah Hujan 2026.html")

TYPES = [("R", "Rain"), ("S", "Slippery"), ("A", "Accident"), ("E", "Evacuation"), ("M", "Mobilisation"),
         ("T", "Technical"), ("NH", "National Holiday"), ("CP", "Community Party"), ("D", "Dust"),
         ("SI", "Social Issue"), ("FM", "Force Majeure"), ("MC", "Mitra Company"), ("RG", "Regulation")]
ROUTES = ["H1", "ISP", "H2"]
# urutan area per route sesuai sheet REKAP LOSS TIME
AREA_ORDER = {"H1": ["Area Mekar Sari", "Area Ketapat", "Area Bintialo", "Area Dayung"],
              "ISP": ["Area ISP"],
              "H2": ["Area Selaro", "Area Pakerin", "Area B 80", "Area Mendis"]}


def find_sources():
    """Satu file per bulan dari folder bulanan (mis. '11. November 2026').
    Prioritas: R_Adjust (hasil penyesuaian) > revisi angka tertinggi (R_00, R_01, ...).
    File lain (R_Coba, dll.) diabaikan. Argumen baris perintah = pakai file itu saja."""
    if len(sys.argv) > 1:
        return sys.argv[1:]
    per_month = {}
    for f in glob.glob(os.path.join(FOLDER, "*", "*Info stop Hauling R_*.xlsx")):
        name = os.path.basename(f)
        if name.startswith("~$") or not re.match(r"\d{2}\. ", os.path.basename(os.path.dirname(f))):
            continue                                   # hanya folder bulanan "NN. Bulan YYYY"
        p = re.match(r"(\d{4})\.(\d{2})\.", name)
        m = re.search(r"R_(\w+)\.xlsx$", name, re.I)
        if not (p and m):
            continue
        tag = m.group(1)
        if tag.lower() == "adjust":
            rank = 10_000
        elif tag.isdigit():
            rank = int(tag)
        else:
            continue
        key = (int(p.group(1)), int(p.group(2)))
        cand = (rank, os.path.getmtime(f), f)
        if key not in per_month or cand > per_month[key]:
            per_month[key] = cand
    if not per_month:
        raise SystemExit(f"Tidak ada file '*Info stop Hauling R_nn.xlsx' di subfolder bulanan {FOLDER}")
    return [per_month[k][2] for k in sorted(per_month)]


AREA_ROUTE = {a: rt for rt, lst in AREA_ORDER.items() for a in lst}


def km_route(loc):
    """Route dari kolom Location (KM): teks 'ISP' / KM 66-71 = ISP, KM >= 72 = H1, KM < 66 = H2."""
    if isinstance(loc, str) and "ISP" in loc.upper():
        return "ISP"
    km = num(loc)
    if km is None:
        return None
    return "ISP" if 66 <= km <= 71 else "H1" if km > 71 else "H2"


def dur_hours(v):
    if isinstance(v, dt.datetime):
        v = v.time()
    if isinstance(v, dt.time):
        return v.hour + v.minute / 60 + v.second / 3600
    return num(v)


def to_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    return None


def hhmm(v):
    if isinstance(v, dt.datetime):
        v = v.time()
    if isinstance(v, dt.time):
        return f"{v.hour:02d}:{v.minute:02d}"
    if isinstance(v, (int, float)) and not isinstance(v, bool):   # pecahan hari
        m = round((v % 1) * 1440)
        return f"{m // 60 % 24:02d}:{m % 60:02d}"
    if isinstance(v, str):
        s = v.strip().replace(".", ":")
        mm = re.match(r"^(\d{1,2}):(\d{2})", s)
        return f"{int(mm.group(1)):02d}:{mm.group(2)}" if mm else s
    return ""


def num(v):
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.replace(",", "."))
        except ValueError:
            return None
    return None


def txt(v):
    if v is None:
        return ""
    return " ".join(str(v).split())


def header(ws, must, max_row=10):
    for i, row in enumerate(ws.iter_rows(min_row=1, max_row=max_row, values_only=True), start=1):
        names = [c.strip() if isinstance(c, str) else c for c in row]
        if all(m in names for m in must):
            cols = {}
            for j, n in enumerate(names):
                if isinstance(n, str) and n not in cols:
                    cols[n] = j
            return i, cols
    raise SystemExit(f"Header {must} tidak ditemukan di sheet '{ws.title}'")


def pos_name(p):
    p = txt(p)
    if "SBL" in p.upper():
        return "SBL Port"
    return p


def pos_route(p):
    if p == "SBL Port":
        return "H2"
    if "ISP" in p.upper():
        return "ISP"
    m = re.search(r"KM\s*(\d+)", p, re.I)
    if m:
        return "H1" if int(m.group(1)) >= 75 else "H2"
    return "H2"


def pos_key(p):
    r = ROUTES.index(pos_route(p))
    if p == "SBL Port":
        return (r, 1, 0)
    m = re.search(r"(\d+)", p)
    return (r, 0, -int(m.group(1)) if m else 0)


def read_file(src, codes, cek, stop, rain, months_info):
    name = os.path.basename(src)
    p = re.match(r"(\d{4})\.(\d{2})\.", name)
    ym = f"{p.group(1)}-{p.group(2)}" if p else None
    tmp = os.path.join(tempfile.gettempdir(), f"mmj_lt_src_{len(months_info)}.xlsx")
    shutil.copy2(src, tmp)                       # aman walau file sedang dibuka di Excel
    wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)
    info = {"file": name, "ym": ym, "stop": 0, "rain": 0, "h": 0.0}

    # ---------- Input Stop Hauling ----------
    ws = wb["Input Stop Hauling"]
    hr, H = header(ws, ["Tanggal", "Duration", "Code Type", "Route"])
    # file lama (Jan-Mei) kolom durasi jam tanpa judul -> kolom tepat sesudah "Duration"
    dcol = H.get("Convert Duration", H["Duration"] + 1)
    g = lambda r, n: r[H[n]] if n in H and H[n] < len(r) else None
    for r in ws.iter_rows(min_row=hr + 1, values_only=True):
        d = to_date(g(r, "Tanggal"))
        if d is None:
            continue
        no = g(r, "No")
        dur = num(r[dcol]) if dcol < len(r) else None
        code = txt(g(r, "Code Type")).upper()
        route = txt(g(r, "Route")).upper()
        area = txt(g(r, "Area"))
        t2 = txt(g(r, "Desc Type2")) or txt(g(r, "Desc Type"))
        base = {"no": no, "d": d.isoformat(), "src": f"Stop Hauling {ym or ''}".strip()}
        if ym and d.isoformat()[:7] != ym:
            cek.append({**base, "msg": f"Tanggal di luar bulan file ({name}) - tidak dihitung", "hapus": True}); continue
        if dur is None:
            cek.append({**base, "msg": "Convert Duration kosong / bukan angka - tidak dihitung", "hapus": True}); continue
        if code not in codes:
            if dur:
                cek.append({**base, "msg": f"Code Type '{code or '-'}' tidak dikenal ({dur:.2f} jam) - tidak dihitung", "hapus": True})
            continue
        # Jan-Jun: ikuti kolom Route apa adanya (hanya H1 & H2). Jul-Des: 3 route (H1 / ISP / H2), Area ISP = ISP.
        three = d.month >= 7
        if three and area == "Area ISP":
            rt = "ISP"
        elif route in ROUTES and (three or route != "ISP"):
            rt = route
        elif area in AREA_ROUTE:
            rt = AREA_ROUTE[area]
            cek.append({**base, "msg": f"Route kosong, diambil dari Area ({area} -> {rt}) - tetap dihitung", "hapus": False})
        elif km_route(g(r, "Location (KM)")):
            loc = g(r, "Location (KM)")
            rt = km_route(loc)
            cek.append({**base, "msg": f"Route & Area kosong, diambil dari lokasi ('{txt(loc)}' -> {rt}) - tetap dihitung", "hapus": False})
        else:
            if dur:
                cek.append({**base, "msg": f"Route '{route or '-'}' & Area '{area or '-'}' tidak dikenali ({dur:.2f} jam) - tidak dihitung", "hapus": True})
            continue
        if not three and rt == "ISP":
            # Jan-Jun belum ada route ISP: pola input = KM ISP >= 68 diisi H1, di bawahnya H2
            km = num(g(r, "Location (KM)"))
            rt = "H1" if km is not None and km >= 68 else "H2"
            cek.append({**base, "msg": f"Jan-Jun hanya route H1/H2: Route kosong di lokasi ISP (KM {txt(g(r, 'Location (KM)')) or '-'}) -> {rt} - tetap dihitung", "hapus": False})
        if code == "MC" and t2.lower() in ("isi data", "") and dur:
            cek.append({**base, "msg": f"Mitra Company: Desc Type2 belum diisi ('{t2 or '-'}') - tetap dihitung", "hapus": False})
        stop.append({"d": d.isoformat(), "r": rt, "c": code, "t2": t2, "h": round(dur, 6),
                     "km": num(g(r, "Location (KM)")), "area": area, "blok": txt(g(r, "Blok")),
                     "desc": txt(g(r, "Description")), "f": hhmm(g(r, "From")), "t": hhmm(g(r, "To")), "no": no})
        info["stop"] += 1; info["h"] += dur

    # ---------- Input TCH ----------
    ws = wb["Input TCH"]
    hr, H = header(ws, ["Tanggal", "Pos", "Rainfall"])
    g = lambda r, n: r[H[n]] if n in H and H[n] < len(r) else None
    dconv = H.get("Duration Convert", H.get("Convert Duration"))
    for r in ws.iter_rows(min_row=hr + 1, values_only=True):
        d = to_date(g(r, "Tanggal"))
        if d is None or not txt(g(r, "Pos")):
            continue
        if ym and d.isoformat()[:7] != ym:
            continue
        no = g(r, "No")
        hv = num(r[dconv]) if dconv is not None and dconv < len(r) else None
        if hv is None and "Duration" in H:
            nxt = H["Duration"] + 1
            hv = num(r[nxt]) if nxt < len(r) else None          # kolom konversi tanpa judul
            if hv is None:
                hv = dur_hours(g(r, "Duration"))
        rv = g(r, "Rainfall")
        rf = num(rv)
        if rf is None:
            if txt(rv) not in ("", "-"):
                cek.append({"no": no, "d": d.isoformat(), "src": f"TCH {ym or ''}".strip(), "msg": f"Rainfall '{txt(rv)}' bukan angka - dianggap 0", "hapus": False})
            rf = 0.0
        rain.append({"d": d.isoformat(), "p": pos_name(g(r, "Pos")), "mm": round(rf, 3), "h": round(hv or 0, 6),
                     "f": hhmm(g(r, "From")), "t": hhmm(g(r, "To")), "no": no})
        info["rain"] += 1

    # ---------- RAIN FALL: curah hujan PORT SBL (data dari SBL tidak diinput di Input TCH) ----------
    info["sbl"] = 0
    sbl_tch = {x["d"] for x in rain if x["p"] == "SBL Port" and x["d"][:7] == ym}
    if "RAIN FALL" in wb.sheetnames:
        rows = list(wb["RAIN FALL"].iter_rows(min_row=1, max_row=60, values_only=True))
        hi = c0 = None
        for i, r in enumerate(rows[:15]):
            for j, v in enumerate(r):
                if isinstance(v, str) and " ".join(v.split()).upper() == "PORT SBL":
                    hi, c0 = i, j
                    break
            if hi is not None:
                break
        if hi is not None and hi + 1 < len(rows):
            sub = rows[hi + 1]
            ch = cm = None
            for j in range(c0, min(c0 + 4, len(sub))):
                s = txt(sub[j]).lower().replace(" ", "")
                if s.startswith("rain,hr") and ch is None:
                    ch = j
                elif s == "rainfall" and cm is None:
                    cm = j
            if ch is None or cm is None:
                cek.append({"no": None, "d": f"{ym}-01", "src": f"RAIN FALL {ym or ''}".strip(),
                            "msg": "Kolom rain,hr / rainfall PORT SBL tidak ditemukan di sheet RAIN FALL", "hapus": False})
            else:
                for r in rows[hi + 2:]:
                    d = to_date(r[0] if r else None)
                    if d is None or (ym and d.isoformat()[:7] != ym) or d.isoformat() in sbl_tch:
                        continue
                    h = num(r[ch]) if ch < len(r) else None
                    mm = num(r[cm]) if cm < len(r) else None
                    if not (h or mm):
                        continue
                    rain.append({"d": d.isoformat(), "p": "SBL Port", "mm": round(mm or 0, 3), "h": round(h or 0, 6),
                                 "f": "", "t": "", "no": "RAIN FALL"})
                    info["sbl"] += 1
    wb.close()
    try:
        os.remove(tmp)
    except OSError:
        pass
    months_info.append(info)


def main():
    srcs = find_sources()
    codes = [c for c, _ in TYPES]
    cek, stop, rain, months_info = [], [], [], []
    for src in srcs:
        print(f"Membaca : {os.path.relpath(src, FOLDER)}")
        read_file(src, codes, cek, stop, rain, months_info)

    # ---------- cek jam bertumpuk di dalam satu route (SOP 8.4 butir 4) ----------
    def tmin(s):
        m = re.match(r"^(\d{1,2}):(\d{2})", s or "")
        if not m:
            return None
        v = int(m.group(1)) * 60 + int(m.group(2))
        return v + 1440 if v < 360 else v
    groups = {}
    for s in stop:
        a, b = tmin(s["f"]), tmin(s["t"])
        if s["h"] <= 0 or a is None or b is None:
            continue
        if b <= a:
            b += 1440
        groups.setdefault((s["d"], s["r"]), []).append((a, b, s["h"] / ((b - a) / 60), s["no"]))
    for (d, rt), ev in sorted(groups.items()):
        pts = sorted({p for e in ev for p in e[:2]})
        excess, nos = 0.0, set()
        for x, y in zip(pts, pts[1:]):
            act = [e for e in ev if e[0] <= x and e[1] >= y]
            load = sum(e[2] for e in act)
            if load > 1.0001:
                excess += (load - 1) * (y - x) / 60
                nos.update(e[3] for e in act)
        if excess > 0.05:
            lst = ", ".join(str(n) for n in sorted(nos, key=lambda n: (not isinstance(n, (int, float)), n if isinstance(n, (int, float)) else 0))[:8])
            cek.append({"no": "", "d": d, "src": f"Stop Hauling {d[:7]}",
                        "msg": f"Jam bertumpuk di route {rt}: {excess:.2f} jam (No {lst}{'…' if len(nos) > 8 else ''}) - total route tetap seperti Excel, di H0 dihitung sekali", "hapus": False})

    # ---------- kamus pos & area ----------
    pos = sorted({x["p"] for x in rain} | {"SBL Port"}, key=pos_key)
    areas = {rt: list(AREA_ORDER[rt]) for rt in ROUTES}
    for s in stop:
        if s["area"] and s["area"] not in areas[s["r"]]:
            areas[s["r"]].append(s["area"])

    dates = [x["d"] for x in stop] + [x["d"] for x in rain]
    payload = {
        "types": [{"c": c, "n": n} for c, n in TYPES], "routes": ROUTES,
        "pos": [{"n": p, "r": pos_route(p)} for p in pos], "areas": areas,
        "stop": stop, "rain": rain, "cek": cek,
        "meta": {"source": ", ".join(m["file"] for m in months_info), "files": months_info,
                 "first": min(dates), "last": max(dates),
                 "generated": dt.datetime.now().strftime("%d-%m-%Y %H:%M")},
    }
    html = open(TEMPLATE, encoding="utf-8").read()
    if "/*DATA*/null" not in html:
        raise SystemExit("Template rusak: penanda /*DATA*/null tidak ditemukan")
    html = html.replace("/*DATA*/null", json.dumps(payload, separators=(",", ":"), ensure_ascii=False))
    logo = os.path.join(TOOLS, "logo_mmj.png")
    if os.path.exists(logo):
        html = html.replace("__LOGO__", "data:image/png;base64," + base64.b64encode(open(logo, "rb").read()).decode())
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(html)

    tot = {rt: sum(s["h"] for s in stop if s["r"] == rt) for rt in ROUTES}
    for m in months_info:
        mh = {rt: sum(s["h"] for s in stop if s["r"] == rt and s["d"][:7] == m["ym"]) for rt in ROUTES}
        print(f"  {m['ym']}  {m['file']:<42} {m['stop']:>4} baris  jumlah route {m['h']:8.2f} jam  (H1 {mh['H1']:.2f} | ISP {mh['ISP']:.2f} | H2 {mh['H2']:.2f})  TCH {m['rain']}  SBL {m.get('sbl', 0)} hari")
    print(f"Stop hauling : {len(stop)} baris dihitung")
    print(f"Loss time    : H1 {tot['H1']:.2f} jam | ISP {tot['ISP']:.2f} jam | H2 {tot['H2']:.2f} jam | jumlah route {sum(tot.values()):.2f} jam (Total H0 dihitung di dashboard)")
    print(f"Input TCH    : {len(rain)} baris, {len(pos)} pos")
    print(f"Data         : {payload['meta']['first']} s/d {payload['meta']['last']}  |  {len(cek)} catatan cek data")
    print(f"Selesai      : {OUTPUT}")


if __name__ == "__main__":
    main()
