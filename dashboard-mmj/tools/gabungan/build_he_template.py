"""
Buat `he_template.html` (dashboard Timesheet HE) untuk dipakai sebagai satu tab
di dalam shell "Dashboard MMJ 2026" (dashboard-mmj/index.html).

Sumber (root repo):
    index.html      -> struktur HTML dashboard HE
    css/style.css   -> CSS dashboard HE
    js/data.js      -> data HE  (const DATA, DAILY, BELUM, DAILYUNIT)
    js/wt-data.js   -> data WT  (const WT_DATA)
    js/app.js       -> logika HE
    js/wt.js        -> logika WT
    assets/logo-mmj.png

Jalankan:  python build_he_template.py
Output  :  he_template.html  (file ini dibaca build_gabungan.py sebagai EXTRA "he")
"""
import os, re, json, base64, datetime as dt

TOOLS = os.path.dirname(os.path.abspath(__file__))          # .../tools/gabungan
ROOT = os.path.abspath(os.path.join(TOOLS, "..", "..", ".."))  # root repo (dashboard-mmj -> repo)
OUT = os.path.join(TOOLS, "he_template.html")

HTML = os.path.join(TOOLS, "he_index.html")
CSS = os.path.join(ROOT, "css", "style.css")
JS_DATA = os.path.join(ROOT, "js", "data.js")
JS_WT = os.path.join(ROOT, "js", "wt-data.js")
JS_APP = os.path.join(ROOT, "js", "app.js")
JS_WTJS = os.path.join(ROOT, "js", "wt.js")
LOGO = os.path.join(ROOT, "assets", "logo-mmj.png")
BELUM = os.path.join(ROOT, "data", "belum.json")


def read(p):
    with open(p, encoding="utf-8-sig") as f:
        return f.read()


def js_to_json(txt):
    """Object literal JS -> JSON (kunci tanpa tanda kutip jadi diberi tanda kutip)."""
    txt = re.sub(r'([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:', r'\1"\2":', txt)
    return json.loads(txt)


def js_const(txt, name):
    """Ambil nilai array dari `const NAME = [ ... ];` (format JSON atau object literal JS)."""
    i = txt.index("const %s" % name)
    j = txt.index("[", i)
    depth = 0
    for k in range(j, len(txt)):
        if txt[k] == "[":
            depth += 1
        elif txt[k] == "]":
            depth -= 1
            if depth == 0:
                break
    return js_to_json(txt[j:k + 1])


def num(v):
    try:
        s = str(v if v is not None else "").replace("%", "").replace(",", ".")
        return float(s) if s not in ("", "-") else 0.0
    except Exception:
        return 0.0


def build_summary():
    data = js_const(read(JS_DATA), "DATA")
    wt = js_const(read(JS_WT), "WT_DATA")
    he = [d for d in data if (d.get("Jenis") or "") != "Water Truck"]

    belum = {}
    if os.path.exists(BELUM):
        try:
            for b in json.loads(read(BELUM)):
                days = b.get("Days") or {}
                if any(num(days.get(str(h))) <= 0 for h in range(1, 31)):
                    belum[b.get("Unit")] = True
        except Exception:
            pass

    def agg(rows, key):
        out = {}
        for r in rows:
            v = r.get(key) or "-"
            out.setdefault(v, {"unit": 0, "hm": 0.0, "ma": [], "fuel": 0.0})
            out[v]["unit"] += 1
            out[v]["hm"] += num(r.get("HMTotal"))
            out[v]["fuel"] += num(r.get("Fuel"))
            m = num(r.get("MA"))
            if m > 0:
                out[v]["ma"].append(m)
        return out

    vendor = []
    for v, a in sorted(agg(he, "Vendor").items()):
        vendor.append({
            "v": v, "unit": a["unit"], "hm": round(a["hm"], 1),
            "ma": round(sum(a["ma"]) / len(a["ma"]), 1) if a["ma"] else 0,
            "fuel": round(a["fuel"], 1),
        })

    wtr = []
    for d in wt:
        hm = 0.0
        p = 0.0
        days = d.get("Days") or {}
        for k, dv in days.items():
            hm += num(dv.get("HM"))
            p += num(dv.get("P"))
        wtr.append({"u": d.get("Unit"), "v": d.get("Vendor"), "p": round(p, 1), "hm": round(hm, 1),
                    "ma": num(d.get("MA")), "pa": num(d.get("PA"))})

    rows = []
    for d in he:
        rows.append({
            "u": d.get("Unit"), "v": d.get("Vendor"), "a": d.get("Area"), "j": d.get("Jenis"),
            "ma": num(d.get("MA")), "hm": num(d.get("HMTotal")), "pa": num(d.get("PAPct")),
            "fuel": num(d.get("Fuel")), "ratio": num(d.get("FuelRatio")), "cap": d.get("Capacity") or "",
            "belum": 1 if belum.get(d.get("Unit")) else 0,
        })

    ma = [num(d.get("MA")) for d in he if num(d.get("MA")) > 0]
    pa = [num(d.get("PAPct")) for d in he if num(d.get("PAPct")) > 0]
    ratio = [num(d.get("FuelRatio")) for d in he if num(d.get("FuelRatio")) > 0]

    return {
        "meta": {"generated": dt.datetime.now().strftime("%d-%m-%Y %H:%M"),
                 "periode": "November 2026", "lastDate": "2026-11-30"},
        "unit": len(he),
        "wtUnit": len(wt),
        "totalUnit": len(he) + len(wt),
        "hm": round(sum(num(d.get("HMTotal")) for d in he), 1),
        "ma": round(sum(ma) / len(ma), 1) if ma else 0,
        "pa": round(sum(pa) / len(pa), 1) if pa else 0,
        "fuel": round(sum(num(d.get("Fuel")) for d in he), 1),
        "ratio": round(sum(ratio) / len(ratio), 2) if ratio else 0,
        "penyiraman": round(sum(w["p"] for w in wtr), 0),
        "belumUnit": sum(1 for r in rows if r["belum"]),
        "vendor": vendor,
        "rows": rows,
        "wt": wtr,
    }


def main():
    html = read(HTML)
    css = read(CSS)
    app = read(JS_APP)
    wtjs = read(JS_WTJS)

    # --- body dashboard HE (tanpa <script src> yg akan diganti inline) ---
    b = html.find("<body")
    body = html[html.find(">", b) + 1: html.rfind("</body>")]
    body = re.sub(r'\s*<script src="js/[^"]+"></script>', "", body)
    body = body.replace('src="assets/logo-mmj.png"', 'src="__HE_LOGO__"')

    # --- semua script HE digabung jadi 1 script (biar const DATA terlihat antar file) ---
    js_all = "\n".join([read(JS_STD), read(JS_DATA), read(JS_WT), app, wtjs,
                        "/* panggil init DOMContentLoaded (di shell document sudah load) */\n"
                        "if(document.readyState!=='loading'){try{document.dispatchEvent(new Event('DOMContentLoaded'));}catch(e){}}"])

    # --- summary untuk dashboard Monitoring (dibaca exec via window.mmjData('he')) ---
    summary = json.dumps(build_summary(), ensure_ascii=False, separators=(",", ":"))
    summary_js = "const DATA = %s;\n" % summary

    logo = ""
    if os.path.exists(LOGO):
        logo = "data:image/png;base64," + base64.b64encode(open(LOGO, "rb").read()).decode()

    out = """<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard Timesheet HE - MMJ November 2026</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap">
<style>
%s
</style>
</head>
<body>
%s
<script>
%s
</script>
<script>
%s</script>
</body>
</html>
""" % (css, body, js_all, summary_js)

    out = out.replace("__HE_LOGO__", logo)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(out)
    print("Selesai : %s  (%.1f KB)" % (OUT, len(out.encode("utf-8")) / 1024))


if __name__ == "__main__":
    main()
