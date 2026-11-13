"""
Pecah halaman gabungan (satu file HTML besar) menjadi situs modular.

Masukan : HTML gabungan (hasil build_gabungan_he.py) sebagai string.
Keluaran (di root repo, siap dipublikasikan GitHub Pages):

    index.html                markup + <template> tiap dashboard, tanpa CSS/JS inline
    assets/css/boot.css       CSS tampilan awal sebelum tab aktif
    assets/css/intro.css      CSS animasi pembuka (dari tools/gabungan/intro.css)
    assets/css/<tab>.css      CSS tiap dashboard (hanya dimuat saat tab dibuka)
    assets/data/<tab>.js      data mentah  -> window.MMJ_DATA[<tab>]
    assets/js/shell.js        loader halaman (dari shell_loader.js)
    assets/js/auth.js         daftar user + sesi + cek role (dari tools/gabungan/auth.js)
    assets/css/login.css      gaya halaman login (dari tools/gabungan/login.css)
    assets/css/shell.css      gaya menu user di sidebar (dari tools/gabungan/shell.css)
    login.html                halaman login (dari tools/gabungan/login.html)
    assets/js/intro.js        animasi pembuka (dari tools/gabungan/intro.js)
    assets/js/tab-nav.js      menu dashboard di sidebar (dipakai semua tab)
    assets/js/tab/<tab>.js    logika tiap dashboard (dibungkus IIFE)
    assets/img/favicon.png    ikon halaman (dari data URI di <head>)

Aturan pemecahan script di dalam <template>:
  * <script data-mmj-out="..." data-mmj-mode="...">  -> path & mode eksplisit
  * script yang memuat "__MMJ_TAB__"                 -> assets/js/tab-nav.js (sekali)
  * script yang diawali "const DATA = {...};"        -> data + app (dipisah otomatis)
  * script lain                                      -> assets/js/tab/<tab>.js

Mode eksplisit:
  std      : window.MMJ_STD (data kontrol SOP)  -> disalin apa adanya
  he-rows  : const DATA / DAILY / BELUM   -> window.MMJ_HE.*
  wt       : const WT_PERIODE / WT_DATA   -> window.MMJ_WT.*
  summary  : const DATA (objek)           -> window.MMJ_DATA.he
  he-app   : logika HE + WT (butuh binding DATA/DAILY/BELUM/WT_*)
  app      : logika biasa
"""
import os
import re
import sys
import json
import base64
import datetime
import hashlib

# encoder data ringkas (kolomar + kamus string) -> file data jauh lebih kecil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import data_codec
except Exception:            # pragma: no cover - fallback kalau modul hilang
    data_codec = None

TABS = ["exec", "haul", "batu", "lt", "he"]

# Dashboard Eksekutif membaca data dashboard lain lewat window.mmjData()
DATA_DEPS = {"exec": ["haul", "batu", "lt", "he-summary"]}


# ------------------------------------------------------------------ util -----
# Statistik build + daftar file yang baru saja ditulis (untuk membersihkan
# file yang sudah tidak dipakai tanpa menghapus seluruh folder hasil build).
_STATS = {"written": 0, "unchanged": 0, "removed": 0}
_PRODUCED = set()


def _write(path, text):
    """Tulis file hanya kalau isinya berubah (build lebih cepat, diff bersih)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    _PRODUCED.add(os.path.abspath(path))
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                if f.read() == text:
                    _STATS["unchanged"] += 1
                    return
        except Exception:
            pass
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    _STATS["written"] += 1


def _cleanup_stale(root, subdirs=("css", "data", "js")):
    """Hapus file hasil build lama yang tidak lagi produced."""
    for sub in subdirs:
        d = os.path.join(root, "assets", sub)
        if not os.path.isdir(d):
            continue
        for name in os.listdir(d):
            p = os.path.abspath(os.path.join(d, name))
            if p in _PRODUCED:
                continue
            try:
                os.remove(p)
                _STATS["removed"] += 1
            except OSError:
                pass


def _find_literal(txt, i):
    """i = posisi karakter pembuka { atau [. Kembalikan indeks penutupnya."""
    pairs = {"{": "}", "[": "]"}
    depth = 0
    quote = None
    k = i
    n = len(txt)
    while k < n:
        c = txt[k]
        if quote:
            if c == "\\":
                k += 2
                continue
            if c == quote:
                quote = None
        else:
            if c in "\"'`":
                quote = c
            elif c in pairs:
                depth += 1
            elif c in "}]":
                depth -= 1
                if depth == 0:
                    return k
        k += 1
    raise ValueError("literal tidak tertutup")


def _unwrap_inflate(txt, j):
    """Kalau literal dibungkus MMJ_INFLATE(...), Returns posisi literal dalam.

    (start, end, after) -> start/end = rentang literal, after = posisi setelah
    penutup wrapper (biar sisa kode tidak ikut memotong).
    """
    wrapped = False
    m2 = re.match(r"MMJ_INFLATE\s*\(", txt[j:])
    if m2:
        wrapped = True
        j += m2.end()
        while j < len(txt) and txt[j] in " \t\r\n":
            j += 1
    if j >= len(txt) or txt[j] not in "{[":
        return None
    try:
        end = _find_literal(txt, j)
    except ValueError:
        return None
    after = end + 1
    if wrapped:
        k = after
        while k < len(txt) and txt[k] in " \t\r\n":
            k += 1
        if txt[k:k + 1] == ")":
            k += 1
        after = k
    return j, end, after


def _split_const(txt, name):
    """Ambil literal setelah `const NAME = ...` -> (literal, sisa tanpa const itu)."""
    m = re.search(r"\bconst\s+%s\s*=\s*" % re.escape(name), txt)
    if not m:
        return None
    span = _unwrap_inflate(txt, m.end())
    if not span:
        return None
    j, end, after = span
    lit = txt[j:end + 1]
    rest = txt[:m.start()] + re.sub(r"^[ \t]*;", "", txt[after:], count=1)
    return lit, rest


def _is_only_comments(txt):
    for line in txt.split("\n"):
        s = line.strip()
        if s and not s.startswith("//"):
            return False
    return True


def _split_data_prefix(code):
    """`const DATA = { ... };` di awal script -> (json, sisa) bila JSON valid.

    Bentuk `const DATA = MMJ_INFLATE({...});` (hasil pemadatan inline) juga
    dikenali, supaya shell yang sudah dipadatkan tetap bisa dipakai build.
    """
    m = re.search(r"\bconst\s+DATA\s*=\s*", code)
    if not m or not _is_only_comments(code[:m.start()]):
        return None
    span = _unwrap_inflate(code, m.end())
    if not span:
        return None
    j, end, after = span
    if code[j] != "{":
        return None
    lit = code[j:end + 1]
    try:
        json.loads(lit)
    except Exception:
        return None
    rest = re.sub(r"^[ \t]*;", "", code[after:], count=1)
    return lit, rest


# --------------------------------------------------------------- writers ----
HDR = "/* %s - dibuat otomatis oleh emit_site.py, jangan diedit manual. */\n"


def _app_file(rel, tab, code, bindings=""):
    body = HDR % rel + "(function(){\n"
    if bindings:
        body += bindings + "\n"
    body += code.rstrip() + "\n"
    body += ';try{ if(typeof setView==="function") window.setView=setView; }catch(e){}\n'
    body += "})();\n"
    return body


def _compact_literal(lit):
    """Literal JSON -> JSON ringkas (kolomar + kamus string).

    Kembalikan (teks, True) kalau literal bisa dipadatkan, None kalau tidak
    (pemanggil lalu memakai bentuk biasa - perilaku lama, pasti aman).
    Literal yang SUDAH ringkas (hasil pemadatan inline) diteruskan apa adanya
    supaya tidak dibungkus dua kali.
    """
    if data_codec is None:
        return None
    try:
        obj = json.loads(lit)
    except Exception:
        return None
    try:
        if data_codec.is_compact(obj):
            return json.dumps(obj, separators=(",", ":"), ensure_ascii=False), True
        small, used = data_codec.compact_json(obj)
    except Exception:
        return None
    if not used:
        return None
    return small, True


def _decoder_js():
    """Blok decoder (dipakai kalau data disimpan dalam bentuk ringkas)."""
    return data_codec.DECODER_JS.strip() + "\n"


def _data_file(rel, target, lit):
    body = (HDR % rel) + "window.MMJ_DATA = window.MMJ_DATA || {};\n"
    res = _compact_literal(lit)
    if res is None:
        return body + "window.MMJ_DATA[%s] = %s;\n" % (json.dumps(target), lit)
    small = res[0]
    return body + _decoder_js() \
        + "window.MMJ_DATA[%s] = window.MMJ_INFLATE(%s);\n" % (json.dumps(target), small)


def _he_rows_file(rel, code):
    out = [HDR % rel, "window.MMJ_HE = window.MMJ_HE || {};\n"]
    rest = code
    parts = []
    for name in ("DATA", "DAILY", "BELUM"):
        got = _split_const(rest, name)
        if not got:
            continue
        lit, rest = got
        res = _compact_literal(lit)
        if res is None:
            parts.append("window.MMJ_HE.%s = %s;\n" % (name, lit))
        else:
            parts.append("window.MMJ_HE.%s = window.MMJ_INFLATE(%s);\n" % (name, res[0]))
    if any("MMJ_INFLATE(" in p for p in parts):
        out.append(_decoder_js())
    out.extend(parts)
    rest = rest.strip()
    if rest and not _is_only_comments(rest):
        out.append("/* sisa kode data (dijalankan apa adanya) */\n" + rest + "\n")
    return "".join(out)


def _wt_file(rel, code):
    out = [HDR % rel, "window.MMJ_WT = window.MMJ_WT || {};\n"]
    rest = code
    parts = []
    for name in ("WT_PERIODE", "WT_DATA"):
        got = _split_const(rest, name)
        if not got:
            continue
        lit, rest = got
        res = _compact_literal(lit)
        if res is None:
            parts.append("window.MMJ_WT.%s = %s;\n" % (name.replace("WT_", ""), lit))
        else:
            parts.append("window.MMJ_WT.%s = window.MMJ_INFLATE(%s);\n"
                         % (name.replace("WT_", ""), res[0]))
    if any("MMJ_INFLATE(" in p for p in parts):
        out.append(_decoder_js())
    out.extend(parts)
    rest = rest.strip()
    if rest and not _is_only_comments(rest):
        out.append("/* sisa kode data (dijalankan apa adanya) */\n" + rest + "\n")
    return "".join(out)


def _css_blocks(css):
    """Pecah CSS jadi blok tingkat atas: `sel { ... }` dan `@media ... { ... }`."""
    blocks = []
    i, n = 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            break
        depth, k = 0, j
        while k < n:
            if css[k] == "{":
                depth += 1
            elif css[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        if k >= n:
            break
        blocks.append(css[i:k + 1])
        i = k + 1
    return blocks


def _css_key(blk):
    """Kunci pembanding blok CSS (whitespace dirapatkan)."""
    return re.sub(r"\s+", " ", blk).strip()


_CSS_HOIST_MAX_INDEX = 3      # hanya blok paling awal tiap tab yang dipindah


_CSS_PSEUDO = {"hover", "focus", "active", "before", "after", "not", "only",
               "media", "and", "or", "first", "last", "root", "visited",
               "disabled", "checked", "nth", "child", "of", "type"}


def _css_tokens(blk):
    """Token selector (class/id/element) dari sebuah blok CSS."""
    sel = blk.split("{", 1)[0]
    toks = set()
    for t in re.findall(r"[.#]?[A-Za-z_][\w-]*", sel):
        toks.add(t.lstrip(".").lstrip("#"))
    return toks - _CSS_PSEUDO


def _hoist_common_css(css_by_tab):
    """Pindahkan blok CSS yang IDENTIK di >1 tab ke satu file bersama.

    Syarat aman: setelah blok itu tidak ada aturan lain di tab yang sama yang
    memakai token selector yang sama. Kalau ada, blok itu TIDAK dipindah -
    kalau dipindah, urutan cascade berubah dan tampilan bisa bergeser.

    File bersama dimuat sebelum CSS tab (tapi setelah theme.css & shell.css),
    jadi CSS tab tetap bisa menimpanya -> tampilan tidak berubah.

    Return (teks_common, {tab: css_baru}).
    """
    occ = {}
    for tab, css in css_by_tab.items():
        for blk in _css_blocks(css):
            occ.setdefault(_css_key(blk), []).append(tab)
    dup = {k for k, v in occ.items() if len(set(v)) > 1}
    if not dup:
        return "", dict(css_by_tab)

    # blok yang aman dipindah: posisinya di awal setiap tab (urutan cascade
    # tidak berubah) DAN tidak ada aturan sesudahnya dengan token sama
    hoistable = set()
    for tab, css in css_by_tab.items():
        blks = _css_blocks(css)
        later = set()
        for i in range(len(blks) - 1, -1, -1):
            blk = blks[i]
            k = _css_key(blk)
            if k in dup and i <= _CSS_HOIST_MAX_INDEX \
                    and not (_css_tokens(blk) & later):
                hoistable.add(k)
            later |= _css_tokens(blk)

    if not hoistable:
        return "", dict(css_by_tab)

    common = []
    seen = set()
    for tab in css_by_tab:
        for blk in _css_blocks(css_by_tab[tab]):
            k = _css_key(blk)
            if k in hoistable and k not in seen:
                seen.add(k)
                common.append(blk)
    out = {}
    for tab, css in css_by_tab.items():
        keep = [b for b in _css_blocks(css) if _css_key(b) not in hoistable]
        out[tab] = "\n".join(keep)
    return "\n".join(common), out


# ------------------------------------------------------------------ emit -----
_INPUT_FILES = ("theme.css", "shell_loader.js", "auth.js", "intro.css",
                "intro.js", "login.css", "login.html", "shell.css")


def _content_version(html, here):
    """Versi = hash isi (shell + berkas pendukung).

    Efeknya: `?v=` di URL hanya berubah kalau isinya benar-benar berubah,
    jadi build yang tidak mengubah apa pun TIDAK menghasilkan diff (hemat
    unduhan user & `git status` tetap bersih).
    """
    h = hashlib.sha1()
    h.update(html.encode("utf-8"))
    for name in _INPUT_FILES:
        p = os.path.join(here, name)
        if os.path.exists(p):
            with open(p, "rb") as f:
                h.update(f.read())
    return h.hexdigest()[:10]


def emit(html, root, version=None):
    """Pecah `html` menjadi index.html + assets/* di folder `root`."""
    here = os.path.dirname(os.path.abspath(__file__))
    version = version or _content_version(html, here)
    q = "?v=" + version

    tpl_re = re.compile(r'<template id="mmjT_(\w+)">(.*?)</template>', re.S)
    tpls = tpl_re.findall(html)
    if not tpls:
        raise SystemExit("tidak ada <template id=\"mmjT_*\"> di HTML gabungan")

    title = re.search(r"<title>([^<]*)</title>", html)
    title = title.group(1) if title else "Dashboard MMJ 2026"
    boot = re.search(r'<style id="mmjBootCss">(.*?)</style>', html, re.S)
    boot = boot.group(1).strip() if boot else ""

    # ikon halaman: data URI -> file
    fav_href = "assets/img/favicon.png"
    fav = re.search(r'<link rel="icon" href="data:image/(\w+);base64,([^"]+)"', html)
    if fav:
        ext = "png" if fav.group(1) == "png" else fav.group(1)
        fav_href = "assets/img/favicon." + ext
        _write(os.path.join(root, fav_href), "")
        with open(os.path.join(root, fav_href), "wb") as f:
            f.write(base64.b64decode(fav.group(2)))

    nojs = re.search(r'(<div class="mmjbox" id="mmjNojs"[^>]*>.*?</div>)', html, re.S)
    nojs = nojs.group(1) if nojs else ""

    # Catatan: folder assets/css|data|js TIDAK dihapus wholesale lagi.
    # File yang isinya sama tidak ditulis ulang, file yang sudah tidak dipakai
    # saja yang dibersihkan (lihat _cleanup_stale) -> build lebih cepat dan
    # `git status` tetap bersih.
    _PRODUCED.clear()
    for k in _STATS:
        _STATS[k] = 0

    written = set()
    used = set()
    out_tpl = []
    tab_css = []
    css_text = {}
    css_rel = {}

    def unique(rel):
        if rel not in used:
            used.add(rel)
            return rel
        base, ext = os.path.splitext(rel)
        n = 2
        while "%s-%d%s" % (base, n, ext) in used:
            n += 1
        rel = "%s-%d%s" % (base, n, ext)
        used.add(rel)
        return rel

    for tab, body in tpls:
        styles, scripts = [], []

        def take_style(m):
            styles.append(m.group(2))
            return ""

        def take_script(m):
            scripts.append((m.group(1), m.group(2)))
            return ""

        markup = re.sub(r"<style([^>]*)>(.*?)</style>", take_style, body, flags=re.S)
        markup = re.sub(r"<script([^>]*)>(.*?)</script>", take_script, markup, flags=re.S)
        markup = markup.strip("\n")

        # ---- CSS (ditulis nanti, setelah blok duplikat dipindah ke file bersama)
        head_tags = []
        if styles:
            rel = "assets/css/%s.css" % tab
            css_text[tab] = "\n".join(s.strip() for s in styles)
            css_rel[tab] = rel
            tab_css.append((tab, rel))
            head_tags.append('<link data-mmj-head rel="stylesheet" href="%s%s">' % (rel, q))

        # ---- script (data + app)
        tags = []
        for idx, (attrs, code) in enumerate(scripts):
            out = re.search(r'data-mmj-out="([^"]+)"', attrs)
            mode = re.search(r'data-mmj-mode="([^"]+)"', attrs)
            out = out.group(1) if out else None
            mode = mode.group(1) if mode else None

            if mode is None and "__MMJ_TAB__" in code:
                rel = "assets/js/tab-nav.js"
                if rel not in written:
                    nav = code.replace('window.__MMJ_TAB = "__MMJ_TAB__";',
                                       "/* tab aktif diisi oleh loader (assets/js/shell.js) */")
                    nav = nav.replace("__MMJ_TAB__", "window.__MMJ_TAB")
                    _write(os.path.join(root, rel), HDR % rel + nav.strip() + "\n")
                    written.add(rel)
                tags.append(('app', rel))
                continue

            if mode is None:
                split = _split_data_prefix(code)
                if split:
                    lit, rest = split
                    rel_d = "assets/data/%s.js" % tab
                    _write(os.path.join(root, rel_d), _data_file(rel_d, tab, lit))
                    tags.append(("data", rel_d))
                    rel_a = unique("assets/js/tab/%s.js" % tab)
                    _write(os.path.join(root, rel_a),
                           _app_file(rel_a, tab, rest, 'var DATA = window.MMJ_DATA[%s];' % json.dumps(tab)))
                    tags.append(("app", rel_a))
                else:
                    rel_a = unique("assets/js/tab/%s.js" % tab)
                    _write(os.path.join(root, rel_a), _app_file(rel_a, tab, code))
                    tags.append(("app", rel_a))
                continue

            rel = out or unique("assets/js/tab/%s-%d.js" % (tab, idx + 1))
            if mode == "std":
                # data kontrol SOP: file sudah berbentuk window.MMJ_STD -> salin apa adanya
                _write(os.path.join(root, rel), HDR % rel + code.strip() + "\n")
                tags.append(("data", rel))
            elif mode == "he-rows":
                _write(os.path.join(root, rel), _he_rows_file(rel, code))
                tags.append(("data", rel))
            elif mode == "wt":
                _write(os.path.join(root, rel), _wt_file(rel, code))
                tags.append(("data", rel))
            elif mode == "summary":
                got = _split_const(code, "DATA")
                lit = got[0] if got else code.strip().rstrip(";")
                _write(os.path.join(root, rel), _data_file(rel, "he", lit))
                tags.append(("data", rel))
            elif mode == "he-app":
                bind = ('var _H = window.MMJ_HE || {}, _W = window.MMJ_WT || {};\n'
                        'var DATA = _H.DATA || [], DAILY = _H.DAILY || [], BELUM = _H.BELUM || [];\n'
                        'var WT_PERIODE = _W.PERIODE || null, WT_DATA = _W.DATA || [];')
                _write(os.path.join(root, rel), _app_file(rel, tab, code, bind))
                tags.append(("app", rel))
            else:
                _write(os.path.join(root, rel), _app_file(rel, tab, code))
                tags.append(("app", rel))

        # Dashboard Eksekutif butuh data dashboard lain (window.mmjData)
        dep_tags = []
        for dep in DATA_DEPS.get(tab, []):
            dep_tags.append(('data', "assets/data/%s.js" % dep))

        script_tags = "".join(
            '<script type="text/x-mmj-%s" src="%s%s"></script>\n' % (kind, rel, q)
            for kind, rel in (dep_tags + tags))

        out_tpl.append('<template id="mmjT_%s">\n%s\n%s\n%s</template>' % (
            tab, "\n".join(head_tags), markup, script_tags))

    # ---- loader
    here = os.path.dirname(os.path.abspath(__file__))
    loader = open(os.path.join(here, "shell_loader.js"), encoding="utf-8-sig").read()
    _write(os.path.join(root, "assets/js/shell.js"),
           "/* assets/js/shell.js - dibuat dari tools/gabungan/shell_loader.js */\n" + loader)

    # ---- intro (animasi pembuka)
    intro_css = open(os.path.join(here, "intro.css"), encoding="utf-8-sig").read()
    _write(os.path.join(root, "assets/css/intro.css"), HDR % "assets/css/intro.css" + intro_css)
    intro_js = open(os.path.join(here, "intro.js"), encoding="utf-8-sig").read()
    _write(os.path.join(root, "assets/js/intro.js"), HDR % "assets/js/intro.js" + intro_js)

    # ---- auth (login) + css login + css shell
    auth_js = open(os.path.join(here, "auth.js"), encoding="utf-8-sig").read()
    _write(os.path.join(root, "assets/js/auth.js"), HDR % "assets/js/auth.js" + auth_js)
    login_css = open(os.path.join(here, "login.css"), encoding="utf-8-sig").read()
    _write(os.path.join(root, "assets/css/login.css"), HDR % "assets/css/login.css" + login_css)
    shell_css = open(os.path.join(here, "shell.css"), encoding="utf-8-sig").read()
    _write(os.path.join(root, "assets/css/shell.css"), HDR % "assets/css/shell.css" + shell_css)

    # ---- halaman login (dari tools/gabungan/login.html)
    with open(os.path.join(here, "login.html"), encoding="utf-8-sig") as f:
        login_html = f.read()
    login_html = login_html.replace("__V__", "v=" + version)
    _write(os.path.join(root, "login.html"), login_html)

    # ---- design system (token dasar + komponen inti), dimuat sekali
    theme_css = open(os.path.join(here, "theme.css"), encoding="utf-8-sig").read()
    _write(os.path.join(root, "assets/css/theme.css"), HDR % "assets/css/theme.css" + theme_css)

    # ---- CSS tiap tab + file bersama (blok yang identik di >1 tab)
    common_css, css_text = _hoist_common_css(css_text)
    for tab, css in css_text.items():
        rel = css_rel[tab]
        _write(os.path.join(root, rel), HDR % rel + css + "\n")
    if common_css:
        rel_common = "assets/css/common.css"
        _write(os.path.join(root, rel_common),
               HDR % rel_common + "/* CSS yang dipakai bersama beberapa dashboard.\n"
               "   Dimuat SEBELUM CSS tiap tab, jadi CSS tab tetap bisa menimpanya. */\n"
               + common_css + "\n")
    else:
        _write(os.path.join(root, "assets/css/common.css"),
               HDR % "assets/css/common.css" + "/* (belum ada CSS bersama) */\n")

    # ---- boot css
    _write(os.path.join(root, "assets/css/boot.css"), HDR % "assets/css/boot.css" + boot + "\n")

    # ---- index.html
    preloads = "".join('<link rel="preload" as="style" href="%s%s">\n' % (rel, q) for _, rel in tab_css)
    doc = """<!doctype html>
<html lang="id" data-build="%(ver)s">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<link rel="icon" type="image/png" href="%(fav)s%(q)s">
<meta name="theme-color" content="#6366f1">
<meta name="description" content="Dashboard MMJ 2026: Eksekutif, Heavy Equipment (Timesheet HE/WT), Coal Hauling, Batu Split, Loss Time &amp; Rainfall.">
<link rel="stylesheet" id="mmjBootCss" href="assets/css/boot.css%(q)s">
<link rel="stylesheet" href="assets/css/intro.css%(q)s">
<link rel="stylesheet" href="assets/css/theme.css%(q)s">
<link rel="stylesheet" href="assets/css/shell.css%(q)s">
<link rel="stylesheet" href="assets/css/common.css%(q)s">
%(preloads)s</head>
<body>
<!-- terlihat hanya bila JavaScript tidak berjalan -->
%(nojs)s

%(templates)s

<script src="assets/js/auth.js%(q)s"></script>
<script src="assets/js/shell.js%(q)s"></script>
<script src="assets/js/intro.js%(q)s"></script>
</body>
</html>
""" % {"ver": version, "title": title, "fav": fav_href, "q": q,
       "preloads": preloads, "nojs": nojs, "templates": "\n\n".join(out_tpl)}

    _write(os.path.join(root, "index.html"), doc)
    _cleanup_stale(root)
    return {
        "index": os.path.join(root, "index.html"),
        "size": len(doc.encode("utf-8")),
        "tabs": [t for t, _ in tpls],
        "stats": dict(_STATS),
    }
