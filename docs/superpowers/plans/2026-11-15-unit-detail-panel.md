# Panel Detail Unit (Review Unit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Klik Unit ID di tabel Review Unit membuka panel berisi jam Breakdown (dirinci per alasan dari kolom DESCRIPTION), Standby, No Operator, No Job, dan seluruh kategori lain unit itu untuk sebulan penuh.

**Architecture:** Exporter PowerShell baru menulis `unit_detail.json` per bulan; `merge_he_bulanan.py` menambahkannya sebagai kunci `UNITDETAIL`; `build_gabungan_he.py` mengemasnya jadi `window.UNITDETAIL` di `assets/data/he-<MM>.js`; `assets/js/tab/he.js` merender panel dari data itu saat Unit ID diklik. `DAILYUNIT`, tabel, grafik, filter, dan MA/PA tidak disentuh.

**Tech Stack:** PowerShell + Excel COM (exporter), Python 3.15 + openpyxl (verifikasi), Python build (emit_site), JavaScript ES5-style vanilla (dashboard), CSS tema yang sudah ada.

**Spec:** `D:\Timesheet\Dashboard\docs\superpowers\specs\2026-11-15-unit-detail-panel-design.md`

## Global Constraints

- Jangan mengubah `DAILYUNIT`, `DATA`, `DAILY`, `BELUM`, tabel Review Unit, grafik, filter vendor/area/jenis, rentang tanggal, sortir, dan tabel "Timesheet Belum di Terima".
- Breakdown = kolom `Repair` + `Break Down`. Standby = `Rain` + `Slippery`. No Job = `No Work Location`.
- Rincian breakdown wajib berjumlah sama dengan total Breakdown per unit (toleransi 0,15 jam); sisanya masuk label `tanpa keterangan`.
- Semua teks panel berbahasa Indonesia; istilah kolom Excel tetap ditampilkan apa adanya di tabel rincian.
- Tanpa dependensi baru (tidak ada jsdom, tidak ada CDN, tidak ada npm install).
- Harus jalan dari `file://` (tanpa server) dan tanpa error konsol.
- Repo git hanya `D:\Timesheet\Dashboard`. `C:\Users\Rizualdi Fadli\Documents\WB SBL Report` **bukan** repo git — file di sana tidak di-commit.
- Kunci unit ternormalisasi: huruf besar, hanya `A-Z0-9` (`DT 11 GIP` → `DT11GIP`, `DT-11 GIP` → `DT11GIP`). Jangan memakai `unitKey()` yang sudah ada karena itu dipakai pencocokan `DAILYUNIT`.
- Angka jam dibulatkan 1 desimal.

## Review Focus

1. **Nama unit tabel ≠ nama sheet** (`DT 11 GIP` vs `DT-11 GIP`, `FT- 01 GIP`, `TRADO 01 GIP`) — panel tetap harus terbuka dengan angka benar. Diuji di Task 1 & Task 5.
2. **Unit tanpa sheet sama sekali** (`TRADO-02 GIP H2` di November 2026) — panel terbuka memakai cadangan `DAILYUNIT`/kosong dengan catatan, tanpa exception. Diuji di Task 5.
3. **DESCRIPTION kosong / hanya rentang jam** (`(07:00-17:00)`) — jam tidak boleh hilang; harus masuk `tanpa keterangan`. Diuji di Task 1.
4. **Bulan tanpa `UNITDETAIL`** (Oktober, atau `he-10.js` lama di cache) — panel memakai cadangan `DAILYUNIT`, tanpa error konsol. Diuji di Task 5.
5. **Teks DESCRIPTION berisi karakter HTML** (`&`, `<`, kutip) — harus tampil sebagai teks, bukan HTML. Diuji di Task 5.

---

### Task 1: Exporter `export_unit_detail.ps1` + pemeriksa invarian

**Files:**
- Create: `C:\Users\Rizualdi Fadli\Documents\WB SBL Report\export_unit_detail.ps1`
- Create: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\check_unit_detail.py`
- Output: `D:\Temp\wa_timesheet\unit_detail.json`

**Interfaces:**
- Produces: JSON objek berkunci `UDKEY(unit)`; tiap nilai
  `{ "u": str, "v": str, "j": str, "c": {rain,slip,nowork,meals,p2h,hol,trav,rep,bd,nofuel,waitop,noop,notandem: number}, "b": [ {"l": str, "h": number, "d": [[hari, jam], ...]} ] }`
- Produces: `check_unit_detail.py <path_json> <path_data_bulanan>` exit 0 = lulus.

- [ ] **Step 1: Tulis pemeriksa invarian (test) lebih dulu**

`check_unit_detail.py` — argumen: path `unit_detail.json`, path `js/data-bulanan/<MM>.json`:

```python
import json, sys

def udkey(s):
    return "".join(c for c in str(s).upper() if c.isalnum())

detail = json.load(open(sys.argv[1], encoding="utf-8"))
bulan = json.load(open(sys.argv[2], encoding="utf-8"))
data = bulan["DATA"]
err = []

# 1. bentuk dasar
for k, v in detail.items():
    if k != udkey(v["u"]):
        err.append("%s: kunci tidak sama dengan udkey(u)" % k)
    if len(v["c"]) != 13:
        err.append("%s: kategori %d, harus 13" % (k, len(v["c"])))
    total_bd = v["c"]["rep"] + v["c"]["bd"]
    jml = sum(b["h"] for b in v["b"])
    if abs(jml - total_bd) > 0.15:
        err.append("%s: rincian %.1f != repair+bd %.1f" % (k, jml, total_bd))
    if total_bd > 0 and not any(b["l"] == "tanpa keterangan" for b in v["b"]) and \
       abs(jml - total_bd) > 0.15:
        err.append("%s: ada jam breakdown tanpa baris tanpa keterangan" % k)

# 2. cakupan: setiap unit HE di tabel harus punya entri (kecuali yang memang tanpa sheet)
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
```

- [ ] **Step 2: Jalankan untuk memastikan gagal**

Run: `python "D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\check_unit_detail.py" "D:\Temp\wa_timesheet\unit_detail.json" "D:\Timesheet\Dashboard\js\data-bulanan\11.json"`
Expected: FAIL — `FileNotFoundError` / exit 1 karena `unit_detail.json` belum ada.

- [ ] **Step 3: Tulis `export_unit_detail.ps1`**

Pola wajib mengikuti `export_daily_unit.ps1` (variabel yang di-patch `export_he_bulanan.py` harus ada persis): `$base`, `$files`, `$BULAN`, `$TAHUN`, `$tmpDir = "D:\Temp\wa_timesheet"`, `$outFile = "$tmpDir\unit_detail.json"`.

Algoritma:
1. Buka tiap file vendor read-only (Excel COM, `Workbooks.Open($p, $false, $true)`), lepas `Calculation` manual.
2. Untuk tiap sheet: lewati bila nama (upper) termasuk `REVIEW UNIT`, `RECAP FUEL`, `LIST DATA`, atau diawali `SHEET` / `BA `.
3. Deteksi header: baris 7 cari sel yang diawali `DESCRIPTION` → `$cDesc`; baris 8 cari 13 label kategori (`RAIN`, `SLIPPERY`, `NO WORK`, `MEALS`, `P2H`/`P5M`, `HOLIDAY`, `TRAVELLING`, `REPAIR`, `BREAK DOWN`, `NO FUEL`, `WAITING OP`, `NO OPERATOR`, `NO TANDEM`) → `$cols`. Bila `$cDesc` atau kolom kategori tidak lengkap, lewati sheet (ini yang otomatis membuang sheet `MENU`, `RESUME UNIT`, `LIST TIMESHET`).
4. Unit id = nilai `E4` bila ada, jika tidak nama sheet. Kunci = `UDKEY`.
5. Baris data 9–45: jumlahkan 13 kategori; `$bdRow = Repair + Break Down`.
6. Label breakdown dari `DESCRIPTION`:
   - pecah pada `,`, `;`, dan baris baru;
   - potongan dianggap alasan bila (lowercase, spasi dirapikan) diawali `break down`, `breakdown`, `bd `, atau `repair`;
   - buang awalan itu → detail; buang detail yang kosong atau hanya rentang jam (regex `^\(?[0-9:.\-\s]+\)?$`) → `tanpa keterangan`;
   - dedup per baris, urutkan stabil; bila >1 detail unik, bagi `$bdRow` rata;
   - tidak ada potongan cocok → `tanpa keterangan`.
7. Kumpulkan `h` per label dan `d` = daftar `[hari, jam]` (hari dari kolom DATE baris itu, `Day`).
8. Bulatkan 1 desimal; buang label ber-`h` 0.
9. Tulis JSON UTF-8 tanpa BOM, objek berkunci `UDKEY`, nilai `u/v/j/c/b`; `v` = nama vendor dari `$files`, `j` = `C2`/`E2` (EQUIPMENT NAME) bila ada.
10. Log satu baris: `unit_detail: <n> unit, <m> baris breakdown`.

- [ ] **Step 4: Jalankan exporter untuk November**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Rizualdi Fadli\Documents\WB SBL Report\export_unit_detail.ps1"`
Expected: exit 0, file `D:\Temp\wa_timesheet\unit_detail.json` ada, log menyebut jumlah unit ± 100.

- [ ] **Step 5: Jalankan pemeriksa sampai LULUS**

Run: `python "D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\check_unit_detail.py" "D:\Temp\wa_timesheet\unit_detail.json" "D:\Timesheet\Dashboard\js\data-bulanan\11.json"`
Expected: `HASIL: LULUS`, dan baris `tanpa detail: ['TRADO-02 GIP H2']` saja.

- [ ] **Step 6: Uji tiga kasus khusus secara manual (membuktikan Review Focus 1 & 3)**

Run (PowerShell, membaca JSON hasil):
```powershell
$d = Get-Content D:\Temp\wa_timesheet\unit_detail.json -Raw | ConvertFrom-Json
$d.'DT11GIP'.b | Format-Table l,h
$d.'MG09GIP'.b | Where-Object { $_.l -ne 'tanpa keterangan' } | Format-Table l,h
$d.'VC04GIP'.b | Format-Table l,h
```
Expected: `DT11GIP` ada isinya (nama tabel `DT 11 GIP` ≠ nama sheet `DT-11 GIP`, jadi kunci normalisasi terbukti bekerja); `MG09GIP` punya label `low power`; `VC04GIP` punya baris `tanpa keterangan` untuk entri `P5M, P2H, …, Breakdown`.

- [ ] **Step 7: Commit (hanya berkas di repo dashboard)**

```bash
git -C "D:/Timesheet/Dashboard" add dashboard-mmj/tools/gabungan/check_unit_detail.py
git -C "D:/Timesheet/Dashboard" commit -m "feat(he): pemeriksa invarian data unit_detail"
```

`export_unit_detail.ps1` tidak di-commit (di luar repo).

---

### Task 2: Perbaiki `patch_script()` + daftarkan exporter bulanan

**Files:**
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\export_he_bulanan.py:39` (SCRIPTS) dan `:126` (regex `$outFile`)

**Interfaces:**
- Consumes: `export_unit_detail.ps1` dari Task 1 (harus punya baris `$outFile = "$tmpDir\unit_detail.json"`).
- Produces: `patch_script()` mempertahankan nama berkas asli pada baris `$outFile`, hanya mengganti foldernya.

- [ ] **Step 1: Tulis test yang gagal**

Run:
```powershell
python -c "import sys; sys.path.insert(0, r'D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan'); import export_he_bulanan as e; t = e.patch_script('export_unit_detail.ps1', 11, 2026, r'X:\base', [('GIP H2','X:\a.xlsx')], [], r'D:\Temp\wa_timesheet\bulan\11', None); import re; m = re.search(r'(?m)^\$outFile\s*=\s*\"(.*)\"$', t); print('OUTFILE:', m.group(1) if m else None)"
```
Expected: FAIL — `OUTFILE: D:\Temp\wa_timesheet\bulan\11\daily_unit.json` (nama berkas salah, akan menimpa data harian).

- [ ] **Step 2: Ubah baris 126 agar mempertahankan nama berkas**

Ganti:
```python
    text = re.sub(r'(?m)^\$outFile\s*=\s*".*"$', lambda m: '$outFile = "%s\\daily_unit.json"' % outdir, text)
```
dengan (ambil basename dari nilai asli):
```python
    def _outfile(m):
        nama = re.split(r'[\\/]', m.group(1))[-1]
        return '$outFile = "%s\\%s"' % (outdir, nama)
    text = re.sub(r'(?m)^\$outFile\s*=\s*"(.*)"$', _outfile, text)
```

- [ ] **Step 3: Tambahkan exporter ke daftar skrip bulanan**

Ubah `SCRIPTS` (baris 39) menjadi:
```python
SCRIPTS = ["export_review.ps1", "export_daily.ps1", "export_daily_unit.ps1",
           "export_unit_detail.ps1", "export_belum_review.ps1",
           "export_wt_penyiraman.ps1"]
```

- [ ] **Step 4: Jalankan test lagi sampai lulus, dua arah**

Run (perintah sama seperti Step 1, lalu ulangi untuk `export_daily_unit.ps1`):
```powershell
python -c "import sys; sys.path.insert(0, r'D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan'); import export_he_bulanan as e, re; [print(n, '->', re.search(r'(?m)^\$outFile\s*=\s*\"(.*)\"$', e.patch_script(n, 11, 2026, r'X:\base', [('GIP H2','X:\a.xlsx')], [], r'D:\Temp\wa_timesheet\bulan\11', None)).group(1)) for n in ('export_unit_detail.ps1','export_daily_unit.ps1')]"
```
Expected:
```
export_unit_detail.ps1 -> D:\Temp\wa_timesheet\bulan\11\unit_detail.json
export_daily_unit.ps1 -> D:\Temp\wa_timesheet\bulan\11\daily_unit.json
```

- [ ] **Step 5: Commit**

```bash
git -C "D:/Timesheet/Dashboard" add dashboard-mmj/tools/gabungan/export_he_bulanan.py
git -C "D:/Timesheet/Dashboard" commit -m "fix(build): patch_script pertahankan nama berkas output; daftarkan export_unit_detail"
```

---

### Task 3: `merge_he_bulanan.py` meneruskan `UNITDETAIL`

**Files:**
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\merge_he_bulanan.py:51-66`

**Interfaces:**
- Consumes: `D:\Temp\wa_timesheet\bulan\<NN>\unit_detail.json` (bentuk dari Task 1).
- Produces: `js/data-bulanan/<NN>.json` dengan kunci `UNITDETAIL` (objek, `{}` bila berkas tidak ada).

- [ ] **Step 1: Uji keadaan sekarang (gagal)**

Run:
```powershell
python -c "import json; d=json.load(open(r'D:\Timesheet\Dashboard\js\data-bulanan\11.json',encoding='utf-8')); print('UNITDETAIL ada:', 'UNITDETAIL' in d)"
```
Expected: `UNITDETAIL ada: False`

- [ ] **Step 2: Salin berkas bulanan lebih dulu, lalu ubah merger**

Salin hasil Task 1 ke folder bulanan (sekali, manual):
```powershell
Copy-Item D:\Temp\wa_timesheet\unit_detail.json D:\Temp\wa_timesheet\bulan\11\unit_detail.json -Force
```
Lalu di `merge_he_bulanan.py`: setelah baris `wt = read_json(os.path.join(d, "wt_penyiraman.json"))` tambahkan
```python
        detail = read_json(os.path.join(d, "unit_detail.json"))
```
dan tambahkan ke dict `he` setelah `"DAILYUNIT": unit or [],`:
```python
            "UNITDETAIL": detail or {},
```
Sertakan juga jumlahnya di `print(...)` bulan itu: `, len(detail or {})` sebagai `UNITDETAIL %d`.

- [ ] **Step 3: Jalankan merger**

Run: `python "D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\merge_he_bulanan.py"`
Expected: exit 0; baris November menyebut `UNITDETAIL <n>` dengan n > 60; bulan lain menyebut `UNITDETAIL 0` (belum ada berkas) tanpa error.

- [ ] **Step 4: Verifikasi hasil**

Run:
```powershell
python -c "import json; d=json.load(open(r'D:\Timesheet\Dashboard\js\data-bulanan\11.json',encoding='utf-8')); print('keys:', sorted(d.keys())); print('detail:', len(d.get('UNITDETAIL',{}))); print('dailyunit tetap:', len(d['DAILYUNIT']))"
```
Expected: `keys: ['BELUM', 'DAILY', 'DAILYUNIT', 'DATA', 'PERIODE', 'UNITDETAIL']`, `detail:` > 60, `dailyunit tetap: 73`.

- [ ] **Step 5: Commit**

```bash
git -C "D:/Timesheet/Dashboard" add dashboard-mmj/tools/gabungan/merge_he_bulanan.py js/data-bulanan/11.json
git -C "D:/Timesheet/Dashboard" commit -m "feat(he): merge UNITDETAIL ke data bulanan"
```

---

### Task 4: Build mengemas `window.UNITDETAIL`

**Files:**
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\build_gabungan_he.py:615-624`

**Interfaces:**
- Consumes: `js/data-bulanan/<NN>.json` dengan kunci `UNITDETAIL` (Task 3).
- Produces: `assets/data/he-<NN>.js` berisi `window.UNITDETAIL = window.MMJ_INFLATE({...});` (objek global, bukan properti `MMJ_HE`).

- [ ] **Step 1: Uji keadaan sekarang (gagal)**

Run: `Select-String -Path "D:\Timesheet\Dashboard\assets\data\he-11.js" -Pattern "window.UNITDETAIL" -SimpleMatch`
Expected: tidak ada hasil (gagal).

- [ ] **Step 2: Tambahkan kunci ke loop build**

Di `build_gabungan_he.py` ubah loop (baris 615–624) menjadi:
```python
            for key in ("DATA", "DAILY", "BELUM", "DAILYUNIT", "UNITDETAIL"):
                if key not in d:
                    continue
                lit = json.dumps(d[key], ensure_ascii=False, separators=(",", ":"))
                res = emitter._compact_literal(lit)
                val = "window.MMJ_INFLATE(%s)" % res[0] if res else lit
                if key in ("DAILYUNIT", "UNITDETAIL"):
                    lines.append("window.%s = %s;\n" % (key, val))
                else:
                    lines.append("window.%s.%s = %s;\n" % (target, key, val))
```

- [ ] **Step 3: Build ulang halaman**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Rizualdi Fadli\Documents\WB SBL Report\rebuild_gabungan_he.ps1"`
Expected: exit 0, baris ringkasan `index.html = … KB markup | aset = … file`.

- [ ] **Step 4: Verifikasi hasil build di Node (tanpa browser)**

Run:
```powershell
node -e "const fs=require('fs'),vm=require('vm');const c={};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('D:/Timesheet/Dashboard/assets/data/he-11.js','utf8'),c);const u=c.window.UNITDETAIL;const k=Object.keys(u);console.log('unit:',k.length);console.log('DT11GIP:',JSON.stringify(u['DT11GIP'].b));console.log('DAILYUNIT masih ada:',Array.isArray(c.window.DAILYUNIT),c.window.DAILYUNIT.length);console.log('DATA masih ada:',c.window.MMJ_HE.DATA.length);"
```
Expected: `unit:` > 60; `DT11GIP:` array dengan `h` angka; `DAILYUNIT masih ada: true 73`; `DATA masih ada: 73`.

- [ ] **Step 5: Commit**

```bash
git -C "D:/Timesheet/Dashboard" add dashboard-mmj/tools/gabungan/build_gabungan_he.py assets/data/he-11.js Heavy-Equipment/index.html
git -C "D:/Timesheet/Dashboard" commit -m "feat(he): build mengemas window.UNITDETAIL"
```

---

### Task 5: Panel detail unit di `he.js` + CSS

**Files:**
- Modify: `D:\Timesheet\Dashboard\assets\js\tab\he.js` (dekat `unitKey` baris 109; sel Unit ID baris 413; akhir `render()` baris 425)
- Modify: `D:\Timesheet\Dashboard\assets\css\he.css`

**Interfaces:**
- Consumes: `window.UNITDETAIL` (Task 4), `DAILYUNIT`/`DU_MAP` (cadangan), `escHtml`, `num`, `fmt`, `unitKey` yang sudah ada.
- Produces (dipakai Task 6 dan uji manual): `udKey(s) -> string`, `udDetail(unit) -> object|null`, `udCats(unit, row) -> {rep,bd,rain,slip,nowork,meals,p2h,hol,trav,nofuel,waitop,noop,notandem}`, `openUnitPanel(row) -> void`, `closeUnitPanel() -> void`.

- [ ] **Step 1: Tambah helper data (tanpa UI dulu)**

Di `he.js` setelah `unitKey`:
```js
// kunci khusus panel detail: buang semua non-alfanumerik (DT 11 GIP == DT-11 GIP)
function udKey(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

function udDetail(unit) {
  var u = window.UNITDETAIL;
  if (!u) return null;
  return u[udKey(unit)] || null;
}

// kategori bulanan: dari UNITDETAIL bila ada; cadangan hanya total breakdown dari DAILYUNIT
// (idle/ops di DAILYUNIT tidak bisa dipecah per kategori, jadi sengaja dibiarkan 0)
function udCats(unit, row) {
  var d = udDetail(unit);
  if (d && d.c) return d.c;
  var out = { rep: 0, bd: 0, rain: 0, slip: 0, nowork: 0, meals: 0, p2h: 0, hol: 0, trav: 0, nofuel: 0, waitop: 0, noop: 0, notandem: 0 };
  var D = DU_MAP[unitKey(unit)] || {};
  for (var k in D) out.bd += num((D[k] || [])[2]);
  return out;
}
```

- [ ] **Step 2: Render isi panel**

Fungsi `renderUnitPanel(row)` mengembalikan HTML dengan urutan:
1. Judul `UNIT · Jenis · Vendor` (semua lewat `escHtml`).
2. Empat kartu: **Breakdown** (`c.rep + c.bd`), **Standby** (`c.rain + c.slip`), **No Operator** (`c.noop`), **No Job** (`c.nowork`), satuan `jam`.
3. Tabel kategori 13 baris dengan label Indonesia: Breakdown = Repair + Break Down (nilai gabungan, dengan sub-baris Repair dan Break Down), Standby – Rain, Standby – Slippery, **No Job (No Work Location)**, Meals And Rest, P2H, Holiday, Travelling, No Fuel, Waiting Operator, No Operator, No Tandem. Baris bernilai 0 tetap tampil dengan warna redup.
4. Blok **Rincian breakdown**: untuk tiap `b` urut `h` menurun → label (Title Case), `h` jam, daftar tanggal `d` (`3 Nov, 9 Nov`), dan batang proporsi `width: h/total*100%`.
5. Bila `udDetail` null: catatan `Rincian breakdown belum tersedia untuk bulan ini.` dan tabel kategori memakai `udCats` cadangan.
6. Label periode di bawah judul: `Total <BULAN_NAMA[m-1]> <y> — tidak ikut filter rentang tanggal`, memakai `PERIODE`.

- [ ] **Step 3: Pasang panel, buka, dan tutup**

Tambahkan `openUnitPanel(row)` / `closeUnitPanel()`:
- `openUnitPanel` membuat `div.ud-wrap` (role dialog, `aria-modal="true"`, `aria-labelledby="udJudul"`) berisi panel + tombol `.ud-close` (aria-label "Tutup detail unit"), menempel ke `document.body` bila belum ada, mengisi `innerHTML` dari `renderUnitPanel(row)`, menambah kelas `open` pada wrap, menyimpan `document.activeElement`, lalu fokus ke `.ud-close`.
- `closeUnitPanel` menghapus kelas `open`, mengembalikan fokus ke elemen tersimpan.
- Satu listener `keydown` di `document` untuk `Escape` saat panel terbuka; klik pada `.ud-wrap` (bukan `.ud-panel`) menutup.

- [ ] **Step 4: Jadikan Unit ID tombol dan ikat listener sekali**

Ubah baris 413 di `render()`:
```js
    <td><button type="button" class="unit-id" data-unit="${escHtml(d.Unit || '')}"><b>${escHtml(d.Unit || '-')}</b></button></td>
```
Lalu di akhir `render()` (setelah `innerHTML` tbody diisi):
```js
  if (!UD_BOUND) {
    UD_BOUND = true;
    var tb = document.getElementById('tbody');
    if (tb) tb.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.unit-id') : null;
      if (!b) return;
      var nama = b.getAttribute('data-unit');
      var row = lastRows.filter(function (x) { return unitKey(x.Unit) === unitKey(nama); })[0];
      if (row) openUnitPanel(row);
    });
  }
```
`lastRows` sudah diisi tepat sebelum baris ini (baris 427), jadi pindahkan penugasan `lastRows = rows;` ke **atas** blok listener. Tambahkan `var UD_BOUND = false;` di dekat `let hoverIdx`.

- [ ] **Step 5: CSS**

Di `assets/css/he.css` tambahkan: `.unit-id` (tombol transparan, warna `var(--c-link, #1D4ED8)`, garis bawah putus-putus saat hover, `cursor:pointer`, fokus terlihat), `.ud-wrap` (fixed, inset 0, `rgba(15,23,42,.45)`, flex center, `z-index` di atas grafik, `display:none`; `.ud-wrap.open{display:flex}`), `.ud-panel` (`max-width:560px; width:100%; max-height:80vh; overflow:auto; border-radius:14px; padding:18px`), `.ud-cards` (grid 2×2, jadi 4 kolom ≥560px), `.ud-card`, `.ud-table` (font 13px, baris 0 jam `opacity:.45`), `.ud-bd`, `.ud-bar` (tinggi 6px, radius 3px, warna aksen), `.ud-close`. Media query `max-width:640px`: `.ud-panel{max-height:100vh;border-radius:0;height:100%}`.

- [ ] **Step 6: Cek sintaks**

Run: `node --check "D:\Timesheet\Dashboard\assets\js\tab\he.js"`
Expected: tanpa output, exit 0.

- [ ] **Step 7: Verifikasi di browser (Review Focus 1, 2, 4, 5)**

Buka `file:///D:/Timesheet/Dashboard/Heavy-Equipment/index.html` di browser, lalu di konsol:
1. `document.querySelectorAll('.unit-id').length` → sama dengan jumlah baris tabel.
2. Klik `DT 11 GIP` → panel terbuka; angka Breakdown = `udCats('DT 11 GIP').rep + .bd`; tabel rincian tampil (bukan catatan "belum tersedia").
3. Klik `TRADO-02 GIP H2` → panel terbuka, ada catatan "Rincian breakdown belum tersedia untuk bulan ini", tidak ada error konsol.
4. Uji bulan tanpa data detail: di konsol jalankan `delete window.UNITDETAIL`, klik unit mana pun → panel tetap terbuka memakai cadangan, tanpa error; lalu muat ulang halaman.
5. Uji teks berbahaya: di konsol jalankan
   `window.UNITDETAIL[udKey('MG-01 GIP H1')].b.push({l:'tes <b>tebal</b> & kutip "x"',h:1,d:[[3,1]]})`
   lalu buka panel unit itu → label tampil apa adanya sebagai teks (tidak ada huruf tebal, tidak ada elemen `<b>` baru: `document.querySelectorAll('.ud-bd b').length` = 0).
6. Tekan `Esc` → tertutup; klik Unit ID lain lalu klik latar → tertutup; fokus kembali ke tombol asal (periksa `document.activeElement.className`).
7. Tab dari tombol Unit ID → fokus masuk ke tombol tutup panel; Tab berikutnya berputar di dalam panel.
8. Perkecil jendela ke 375 px → panel penuh layar, isi bisa digulir.
9. Bandingkan angka tabel (HM, MA, PA, Fuel) sebelum vs sesudah perubahan pada unit yang sama → identik.

- [ ] **Step 8: Commit**

```bash
git -C "D:/Timesheet/Dashboard" add assets/js/tab/he.js assets/css/he.css
git -C "D:/Timesheet/Dashboard" commit -m "feat(he): panel detail unit pada tabel Review Unit"
```

---

### Task 6: Jalur lama `js\data.js` ikut terisi

**Files:**
- Modify: `C:\Users\Rizualdi Fadli\Documents\WB SBL Report\rebuild_dashboard.ps1:7-16`
- Modify: `C:\Users\Rizualdi Fadli\Documents\WB SBL Report\update_dashboard.ps1:26`

**Interfaces:**
- Consumes: `D:\Temp\wa_timesheet\unit_detail.json` (Task 1).
- Produces: `js/data.js` berisi `const UNITDETAIL = {...};` (cadangan `{}` bila berkas tidak ada).

- [ ] **Step 1: Uji keadaan sekarang (gagal)**

Run: `Select-String -Path "D:\Timesheet\Dashboard\js\data.js" -Pattern "UNITDETAIL" -SimpleMatch`
Expected: tidak ada hasil.

- [ ] **Step 2: Ubah `rebuild_dashboard.ps1`**

Setelah blok `$duFile` (baris 7–14) tambahkan:
```powershell
$udFile = "D:\Temp\wa_timesheet\unit_detail.json"
if (Test-Path $udFile) {
  Copy-Item $udFile "$d\data\unit_detail.json" -Force
  $unitDetail = Get-Content "$d\data\unit_detail.json" -Raw -Encoding UTF8
} else {
  $unitDetail = "{}"
  Write-Output "PERINGATAN: unit_detail.json tidak ada - panel detail unit memakai data cadangan"
}
```
Dan ubah baris `$js = ...` agar menyertakan `const UNITDETAIL = $unitDetail;` setelah `const DAILYUNIT = $dailyUnit;`.

- [ ] **Step 3: Tambahkan langkah di `update_dashboard.ps1`**

Sisipkan setelah baris `Step 'export_daily_unit' 'export_daily_unit.ps1'`:
```powershell
  Step 'export_unit_detail' 'export_unit_detail.ps1'
```

- [ ] **Step 4: Jalankan dan verifikasi**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Rizualdi Fadli\Documents\WB SBL Report\rebuild_dashboard.ps1"`
Expected: exit 0; lalu
Run: `node -e "const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('D:/Timesheet/Dashboard/js/data.js','utf8')+';this.U=UNITDETAIL;this.D=DATA;this.DU=DAILYUNIT;',c);console.log('unit detail:',Object.keys(c.U).length,'| DATA:',c.D.length,'| DAILYUNIT:',c.DU.length);"`
Expected: `unit detail:` > 60, `DATA: 73`, `DAILYUNIT: 73`.

- [ ] **Step 5: Tidak ada commit** (kedua berkas di luar repo git).

---

### Task 7: Catatan memori + dokumen prosedur

**Files:**
- Create page: `gotchas/he-panel-detail-unit.md` (ai-memory, project `Rizualdi Fadli`)
- Modify page: `procedures/dashboard-timesheet-he-update.md` bila ada — bila tidak ada, lewati langkah ini dan sebutkan di ringkasan.

- [ ] **Step 1: Tulis halaman gotcha**

Isi wajib: (a) `patch_script()` dulu selalu menulis `daily_unit.json` sehingga exporter baru menimpa data harian — gejala, akar, perbaikan (pertahankan basename), berkas terlibat; (b) nama unit di tabel ≠ nama sheet (`DT 11 GIP` vs `DT-11 GIP`, `TRADO 01 GIP`, `FT- 01 GIP`) → wajib kunci `A-Z0-9`; (c) `TRADO-02 GIP H2` tidak punya sheet; (d) 982,8 jam breakdown tanpa keterangan pada November 2026 → panel butuh baris "tanpa keterangan".

- [ ] **Step 2: Verifikasi halaman bisa dibaca ulang**

Baca halaman dengan `memory_read_page` dan pastikan judul serta isi utuh.

---

## Catatan eksekusi

- Urutan wajib: Task 1 → 2 → 3 → 4 → 5; Task 6 dan 7 boleh menyusul.
- Jangan menjalankan `update_dashboard.ps1` penuh (langkah `push_dashboard.ps1` akan push ke GitHub Pages) sebelum Task 1–5 lulus verifikasi.
- Build ulang halaman dilakukan dengan `rebuild_gabungan_he.ps1` (tidak melakukan push).
