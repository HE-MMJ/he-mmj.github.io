"""Encoder data ringkas untuk file data Dashboard MMJ.

Tujuan: file data (assets/data/*.js) terlalu besar karena mengulang kunci
objek & nilai yang sama ribuan kali (mis. lt.js: 4.284 baris "stop" ->
934 KB). Format ringkas:

    { "$D": ["kunci1","kunci2",...],      # nama kolom (list of dicts)
      "$R": [ [v1,v2,...], ... ],         # kolom-kolom (per kolom)
      "$S": { "0": ["nilai unik",...], }   # kamus nilai per kolom
      "$M": [0,1,2,...] }                  # mode kolom: 0 polos, 1 RLE, 2 packed

    { "$T": { "c": [ [v1,v2,...], ... ],  # tabel: list of arrays
                "d": [ ["nilai unik",...]|null, ... ],
                "m": [0,1,2,...] } }       # mode kolom: 0 polos, 1 RLE, 2 packed

    { "$A": [ ... ] }                     # list (array) biasa
    { "$O": { kunci: nilai } }            # object biasa

Setiap kolom dipilih encoding yang paling hemat dari:
  polos            -> nilai mentah
  polos + kamus    -> nilai jadi indeks ke kamus
  polos + kamus + packed -> indeks jadi string 1-2 byte per nilai
  RLE              -> [(nilai, jumlah), ...] untuk nilai beruntun
  RLE + kamus      -> [(indeks, jumlah), ...] + kamus

Decoder (JS) mengubahnya kembali menjadi struktur yang PERSIS sama dengan
aslinya, jadi kode dashboard tidak perlu diubah sama sekali. Mode offline
(file://) tetap jalan karena datanya tetap dimuat lewat <script>.
"""
import json

# Penanda "kunci ini tidak ada di baris ini" (JSON tidak punya undefined,
# jadi harus ditandai eksplisit supaya nilai null tetap null).
MISSING = "\u0000MISSING\u0000"

# Alfabet base64 untuk mode "packed" (indeks 1-2 byte per nilai)
ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/"

# decoder JS (disisipkan di setiap file data supaya tidak bergantung urutan muat)
DECODER_JS = r"""
(function(){
  if (window.MMJ_INFLATE) return;
  var MISS = "\u0000MISSING\u0000";
  var AL = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/";
  function inf(n){
    if (n === null || typeof n !== "object") return n;
    if (Array.isArray(n)){ var a=[],i; for(i=0;i<n.length;i++) a.push(inf(n[i])); return a; }
    if (n.$O){ var o={},k; for(k in n.$O) o[k]=inf(n.$O[k]); return o; }
    if (n.$A){ var b=[],j; for(j=0;j<n.$A.length;j++) b.push(inf(n.$A[j])); return b; }
    if (n.$T){
      /* tabel: list of arrays -> kolom-kolom (RLE / packed sesuai mode) */
      var t=n.$T, tcols=t.c, tdicts=t.d||[], tmodes=t.m||[], out=[], i3, j3, k3, tcol, tdv, tmode;
      for (i3=0;i3<tcols.length;i3++){
        tcol=tcols[i3]; tdv=tdicts[i3]; tmode=tmodes[i3]||0;
        if (tmode===1){
          var pos3=0;
          for (j3=0;j3<tcol.length;j3++){
            var run=tcol[j3], val=run[0], cnt=run[1];
            val = tdv ? tdv[val] : val;
            val = inf(val);
            for (k3=0;k3<cnt;k3++){
              if (!out[pos3]) out[pos3]=[];
              out[pos3].push(val);
              pos3++;
            }
          }
        } else if (tmode===2){
          /* indeks disimpan sebagai string 1-2 byte per nilai */
          var s2=tcol, w2=(tdv && tdv.length<=64)?1:2, n2=Math.floor(s2.length/w2);
          for (j3=0;j3<n2;j3++){
            var ix=0;
            for (k3=0;k3<w2;k3++) ix = ix*64 + AL.indexOf(s2.charAt(j3*w2+k3));
            if (!out[j3]) out[j3]=[];
            out[j3].push(inf(tdv[ix]));
          }
        } else {
          for (j3=0;j3<tcol.length;j3++){
            if (!out[j3]) out[j3]=[];
            out[j3].push(tdv ? inf(tdv[tcol[j3]]) : inf(tcol[j3]));
          }
        }
      }
      return out;
    }
    if (n.$D){
      var keys=n.$D, cols=n.$R, dict=n.$S||{}, modes=n.$M||[], rows=[], i2, j2, k2, col, d, v, dv;
      for (i2=0;i2<cols.length;i2++){
        col=cols[i2]; d=dict[i2];
        var md = modes[i2]||0;
        if (md===1){
          var pos2=0;
          for (j2=0;j2<col.length;j2++){
            v=col[j2][0]; dv = (d !== undefined) ? d[v] : v;
            if (dv === MISS){ pos2 += col[j2][1]; continue; }
            dv = inf(dv);
            for (k2=0;k2<col[j2][1];k2++){
              while (rows.length <= pos2+k2) rows.push({});
              rows[pos2+k2][keys[i2]] = dv;
            }
            pos2 += col[j2][1];
          }
        } else if (md===2){
          var s3=col, w3=(d && d.length<=64)?1:2, n3=Math.floor(s3.length/w3);
          for (j2=0;j2<n3;j2++){
            var ix2=0;
            for (k2=0;k2<w3;k2++) ix2 = ix2*64 + AL.indexOf(s3.charAt(j2*w3+k2));
            dv = d[ix2];
            while (rows.length <= j2) rows.push({});
            if (dv !== MISS) rows[j2][keys[i2]] = inf(dv);
          }
        } else {
          for (j2=0;j2<col.length;j2++){
            while (rows.length <= j2) rows.push({});
            if (d !== undefined){
              dv = d[col[j2]];
              if (dv !== MISS) rows[j2][keys[i2]] = inf(dv);
            }
            else {
              v = col[j2];
              if (v !== MISS && v !== undefined) rows[j2][keys[i2]] = inf(v);
            }
          }
        }
      }
      return rows;
    }
    return n;
  }
  window.MMJ_INFLATE = inf;
})();
"""


def _jkey(v):
    """Kunci pembeda nilai (JSON kanonik) - supaya null & angka bedain."""
    return json.dumps(v, ensure_ascii=False, sort_keys=True)


def _jsz(x):
    """Ukuran JSON (byte) dari sebuah nilai."""
    return len(json.dumps(x, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))


def _c(v):
    """Nilai yang disimpan di file (objek/array di dalamnya ikut diringkas)."""
    if isinstance(v, (list, dict)):
        return compact(v)
    return v


def _runs(vals):
    """RLE: [(nilai, jumlah), ...]"""
    runs = []
    for v in vals:
        if runs and _jkey(runs[-1][0]) == _jkey(v):
            runs[-1][1] += 1
        else:
            runs.append([v, 1])
    return runs


def _pack_indices(idxs):
    """Daftar indeks -> string 1-2 byte per indeks (base64)."""
    w = 1 if len(set(idxs)) <= 64 else 2
    out = []
    for i in idxs:
        if w == 1:
            out.append(ALPHA[i])
        else:
            out.append(ALPHA[i // 64] + ALPHA[i % 64])
    return "".join(out)


def _encode_column(vals):
    """Pilih encoding paling hemat untuk satu kolom.

    Return (mode, data, dict):
      mode 0 -> data = daftar nilai (mentah atau indeks ke dict)
      mode 1 -> data = daftar [nilai/indeks, jumlah]  (RLE)
      mode 2 -> data = string berisi indeks 1-2 byte per nilai
      dict  -> daftar nilai unik (atau None bila tidak dipakai)
    """
    n = len(vals)
    seen = {}
    uniq = []
    for v in vals:
        t = _jkey(v)
        if t not in seen:
            seen[t] = len(uniq)
            uniq.append(v)
    # kamus dipakai kalau jumlah nilai unik jauh lebih kecil dari baris
    use_dict = len(uniq) <= max(2, n * 0.25)

    cands = []

    # 1. polos, tanpa kamus
    plain = [_c(v) for v in vals]
    cands.append((_jsz(plain), 0, plain, None))

    # 2. polos + kamus
    idx = None
    if use_dict:
        idx = [seen[_jkey(v)] for v in vals]
        cands.append((_jsz(idx) + _jsz([_c(v) for v in uniq]), 0, idx,
                      [_c(v) for v in uniq]))
        # 3. polos + kamus + packed (indeks jadi 1-2 byte per nilai)
        if len(uniq) <= 4096:
            packed = _pack_indices(idx)
            cands.append((_jsz(packed) + _jsz([_c(v) for v in uniq]), 2, packed,
                          [_c(v) for v in uniq]))

    runs = _runs(vals)

    # 4. RLE, tanpa kamus
    rr = [[_c(v), cnt] for v, cnt in runs]
    cands.append((_jsz(rr), 1, rr, None))

    # 5. RLE + kamus
    if use_dict:
        rseen = {}
        runiq = []
        ridx = []
        for v, cnt in runs:
            t = _jkey(v)
            if t not in rseen:
                rseen[t] = len(runiq)
                runiq.append(v)
            ridx.append([rseen[t], cnt])
        cands.append((_jsz(ridx) + _jsz([_c(v) for v in runiq]), 1, ridx,
                      [_c(v) for v in runiq]))

    best = min(cands, key=lambda x: x[0])
    return best[1], best[2], best[3]


def _same_keys(rows):
    """True kalau semua baris punya kunci yang sama (biar aman jadi kolom)."""
    if not rows:
        return False
    keys = set(rows[0].keys())
    if not keys:
        return False
    for r in rows[1:]:
        if set(r.keys()) != keys:
            return False
    return True


def _compact_dicts(rows):
    """List of dicts -> kolom per kunci + kamus/RLE per kolom."""
    keys = list(rows[0].keys())
    cols = []
    dicts = {}
    modes = []
    for i, k in enumerate(keys):
        vals = [r[k] if k in r else MISSING for r in rows]
        mode, data, dic = _encode_column(vals)
        cols.append(data)
        modes.append(mode)
        if dic is not None:
            dicts[str(i)] = dic
    out = {"$D": keys, "$R": cols}
    if dicts:
        out["$S"] = dicts
    if any(modes):
        out["$M"] = modes
    return out


def _compact_table(rows):
    """List of arrays (tabel) -> kolom-kolom + kamus/RLE per kolom.

    Dipakai untuk data yang sudah berbentuk baris-array (mis. rows batu:
    9.856 baris x 16 kolom).
    """
    n = len(rows)
    m = len(rows[0])
    for r in rows:
        if not isinstance(r, list) or len(r) != m:
            return None
    cols = []
    dicts = []
    modes = []
    for c in range(m):
        vals = [r[c] for r in rows]
        mode, data, dic = _encode_column(vals)
        cols.append(data)
        modes.append(mode)
        dicts.append(dic)
    return {"$T": {"c": cols, "d": dicts, "m": modes}}


def compact(node):
    """Kembalikan bentuk ringkas."""
    if isinstance(node, list):
        if node and all(isinstance(x, dict) for x in node) and _same_keys(node):
            return _compact_dicts(node)
        if node and all(isinstance(x, list) for x in node):
            t = _compact_table(node)
            if t is not None:
                return t
        return {"$A": [compact(x) if isinstance(x, (list, dict)) else x for x in node]}
    if isinstance(node, dict):
        return {"$O": {k: (compact(v) if isinstance(v, (list, dict)) else v)
                        for k, v in node.items()}}
    return node


def _unpack(s, dict_len):
    """String packed -> daftar indeks."""
    w = 1 if dict_len <= 64 else 2
    idxs = []
    for i in range(0, len(s), w):
        if w == 1:
            idxs.append(ALPHA.index(s[i]))
        else:
            idxs.append(ALPHA.index(s[i]) * 64 + ALPHA.index(s[i + 1]))
    return idxs


def inflate(node):
    """Decoder Python (cermin dari DECODER_JS) - dipakai untuk uji bolak-balik."""
    if node is None or not isinstance(node, (dict, list)):
        return node
    if isinstance(node, list):
        return [inflate(x) for x in node]
    if "$O" in node:
        return {k: inflate(v) for k, v in node["$O"].items()}
    if "$A" in node:
        return [inflate(x) for x in node["$A"]]
    if "$T" in node:
        t = node["$T"]
        cols = t["c"]
        dicts = t.get("d") or []
        modes = t.get("m") or []
        out = []
        for i, col in enumerate(cols):
            d = dicts[i] if i < len(dicts) else None
            mode = modes[i] if i < len(modes) else 0
            if mode == 1:
                pos = 0
                for run in col:
                    v = d[run[0]] if d is not None else run[0]
                    v = inflate(v)
                    for _ in range(run[1]):
                        while len(out) <= pos:
                            out.append([])
                        out[pos].append(v)
                        pos += 1
            elif mode == 2:
                for j, ix in enumerate(_unpack(col, len(d))):
                    while len(out) <= j:
                        out.append([])
                    out[j].append(inflate(d[ix]))
            else:
                for j, v in enumerate(col):
                    while len(out) <= j:
                        out.append([])
                    out[j].append(inflate(d[v]) if d is not None else inflate(v))
        return out
    if "$D" in node:
        keys = node["$D"]
        cols = node["$R"]
        dicts = node.get("$S", {})
        modes = node.get("$M", [])
        rows = []
        for i, col in enumerate(cols):
            d = dicts.get(str(i))
            mode = modes[i] if i < len(modes) else 0
            if mode == 1:
                pos = 0
                for run in col:
                    v = d[run[0]] if d is not None else run[0]
                    if v == MISSING:
                        pos += run[1]
                        continue
                    v = inflate(v)
                    for _ in range(run[1]):
                        while len(rows) <= pos:
                            rows.append({})
                        rows[pos][keys[i]] = v
                        pos += 1
            elif mode == 2:
                for j, ix in enumerate(_unpack(col, len(d))):
                    v = d[ix]
                    while len(rows) <= j:
                        rows.append({})
                    if v != MISSING:
                        rows[j][keys[i]] = inflate(v)
            else:
                for j, v in enumerate(col):
                    while len(rows) <= j:
                        rows.append({})
                    if d is not None:
                        dv = d[v]
                        if dv != MISSING:
                            rows[j][keys[i]] = inflate(dv)
                    elif v != MISSING:
                        rows[j][keys[i]] = inflate(v)
        return rows
    return node


def compact_json(node, min_gain=0.05):
    """JSON ringkas; kalau tidak hemat, kembalikan JSON biasa."""
    plain = json.dumps(node, separators=(",", ":"), ensure_ascii=False)
    c = compact(node)
    small = json.dumps(c, separators=(",", ":"), ensure_ascii=False)
    if len(small.encode("utf-8")) < len(plain.encode("utf-8")) * (1 - min_gain):
        return small, True
    return plain, False
