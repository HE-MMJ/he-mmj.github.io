# update_fuel_he.ps1 - isi Fuel & FuelRatio data HE dari Rekap Penggunaan Solar (05. Fuel Report).
#
# Rule sumber fuel:
#   unit GIP H1 / GIP H2  -> sheet 'Input Daily All GIP'
#   unit lain             -> sheet 'Input Daily'
# Fuel harian hanya dijumlah untuk tanggal yang sudah ada di daily_unit.json bulan itu,
# supaya Fuel/HM (FuelRatio) tetap satu periode.
#
# Pakai:
#   powershell -NoProfile -ExecutionPolicy Bypass -File update_fuel_he.ps1            (dry-run)
#   powershell -NoProfile -ExecutionPolicy Bypass -File update_fuel_he.ps1 -Apply     (tulis, 2 bulan terakhir)
#   powershell -NoProfile -ExecutionPolicy Bypass -File update_fuel_he.ps1 -Bulan 10 -Apply
$ErrorActionPreference = 'Stop'
$FUEL = '\\Engineering\01. engineering mmj\9. MMJ 2026\02. MMJ Report\01. Daily Report\05. Fuel Report'
$SRC = 'D:\Temp\wa_timesheet\bulan'
$TAHUN = 2026
$NAMA = @('', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember')

function Key($s) { return (([string]$s) -replace '\s+', ' ').Trim().ToUpper() }
function ToNum($t) {
  if ($null -eq $t) { return 0.0 }
  if ($t -is [double] -or $t -is [int] -or $t -is [decimal]) { return [double]$t }
  $s = ([string]$t).Trim() -replace '%', '' -replace ',', '.'
  $v = 0.0
  if ([double]::TryParse($s, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$v)) { return $v }
  return 0.0
}
function ToDate($v) {
  if ($null -eq $v) { return $null }
  if ($v -is [double]) { try { return [DateTime]::FromOADate($v) } catch { return $null } }
  if ($v -is [DateTime]) { return $v }
  $dt = [DateTime]::MinValue
  if ([DateTime]::TryParse(([string]$v).Trim(), [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::None, [ref]$dt)) { return $dt }
  return $null
}

# Format review_export.json yang dipakai dashboard: "[{" ... "},{" (indentasi 4 spasi).
# Tanpa ini setiap tulis ulang menghasilkan diff kosmetik ~2000 baris.
function ReviewJson($obj) {
  $t = ($obj | ConvertTo-Json -Depth 3) -split "`r?`n" | ForEach-Object { if ($_.StartsWith('    ')) { $_.Substring(4) } else { $_ } }
  return ((($t -join "`n") -replace "^\[\n\{", "[{") -replace "\},\n\{", "},{") -replace "\}\n\]$", "}]"
}
function Write-Text($path, $text) {
  [System.IO.File]::WriteAllText($path, $text + "`n", (New-Object System.Text.UTF8Encoding $true))
}

function LatestFuel($bulan) {
  $dir = Get-ChildItem $FUEL -Directory | Where-Object { $_.Name -match ('^' + ('{0:d2}' -f $bulan) + '\.') } | Select-Object -First 1
  if (-not $dir) { return $null }
  $c = Get-ChildItem $dir.FullName -File | Where-Object {
    $_.Name -like '*.xlsx' -and $_.Name -notlike '~$*' -and $_.Name -match 'solar' -and
    $_.Name -match $NAMA[$bulan] -and $_.Name -notmatch 'copy|backup'
  }
  if (-not $c) { return $null }
  return ($c | Sort-Object `
    @{ Expression = { $m = [regex]::Match($_.Name, 'R(\d+)'); if ($m.Success) { [int]$m.Groups[1].Value } else { -1 } } },
    @{ Expression = { $_.LastWriteTime } } | Select-Object -Last 1).FullName
}

# unit -> hari -> volume, hanya baris bulan & tahun yang diminta
function ReadSheet($sh, $bulan) {
  $last = $sh.Cells.Item($sh.Rows.Count, 3).End(-4162).Row
  $hdr = 0
  for ($r = 1; $r -le [math]::Min(12, [math]::Max($last, 1)); $r++) {
    for ($c = 1; $c -le 26; $c++) {
      if (([string]$sh.Cells.Item($r, $c).Text).Trim().ToUpper() -eq 'TOTAL VOLUME') { $hdr = $r; break }
    }
    if ($hdr -gt 0) { break }
  }
  if ($hdr -eq 0) { throw "header 'TOTAL VOLUME' tidak ada di sheet $($sh.Name)" }
  $cDate = 0; $cUnit = 0; $cVol = 0
  for ($c = 1; $c -le 26; $c++) {
    $t = ([string]$sh.Cells.Item($hdr, $c).Text).Trim().ToUpper()
    if ($t -eq 'DATE' -and $cDate -eq 0) { $cDate = $c }
    elseif ($t -eq 'UNIT ID' -and $cUnit -eq 0) { $cUnit = $c }
    elseif ($t -eq 'TOTAL VOLUME' -and $cVol -eq 0) { $cVol = $c }
  }
  $hash = @{}
  if ($last -le $hdr) { return $hash }
  $arr = $sh.Range($sh.Cells.Item($hdr + 1, 1), $sh.Cells.Item($last, 26)).Value2
  for ($i = 1; $i -le $arr.GetLength(0); $i++) {
    $d = ToDate $arr[$i, $cDate]
    if ($null -eq $d -or $d.Month -ne $bulan -or $d.Year -ne $TAHUN) { continue }
    $u = Key $arr[$i, $cUnit]
    if ($u -eq '') { continue }
    $vol = ToNum $arr[$i, $cVol]
    if ($vol -eq 0) { continue }
    if (-not $hash.ContainsKey($u)) { $hash[$u] = @{} }
    if ($hash[$u].ContainsKey($d.Day)) { $hash[$u][$d.Day] += $vol } else { $hash[$u][$d.Day] = $vol }
  }
  return $hash
}

# --- argumen
$apply = $false; $bulanArg = @(); $srcArg = ''
for ($i = 0; $i -lt $args.Count; $i++) {
  if ($args[$i] -eq '-Apply') { $apply = $true }
  elseif ($args[$i] -eq '-Bulan') { $bulanArg += [int]$args[$i + 1]; $i++ }
  elseif ($args[$i] -match '^-Bulan:(.+)$') { $bulanArg += [int]$Matches[1] }
  elseif ($args[$i] -eq '-Src') { $srcArg = $args[$i + 1]; $i++ }
}
# -Src = folder yang file JSON-nya langsung di akar (dipakai pipeline harian); bulan wajib eksplisit
if ($srcArg -and -not $bulanArg.Count) { throw '-Src butuh -Bulan <nn>: folder akar tidak dipisah per bulan' }
if (-not $bulanArg.Count) { $now = Get-Date; $bulanArg = @($now.AddMonths(-1).Month, $now.Month) }
if ($srcArg) { $SRC = $srcArg }

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false
try {
  foreach ($bulan in ($bulanArg | Sort-Object -Unique)) {
    $mm = '{0:d2}' -f $bulan
    $revPath = Join-Path $SRC "$mm\review_export.json"
    $duPath = Join-Path $SRC "$mm\daily_unit.json"
    if (-not (Test-Path $revPath)) {
      # pipeline harian menyimpan file langsung di akar folder (tanpa subfolder bulan)
      $revPath = Join-Path $SRC 'review_export.json'
      $duPath = Join-Path $SRC 'daily_unit.json'
    }
    if (-not (Test-Path $revPath)) { Write-Output "[$mm] lewati: $revPath tidak ada"; continue }
    $f = LatestFuel $bulan
    if (-not $f) { Write-Output "[$mm] lewati: rekap solar tidak ada"; continue }

    $wb = $xl.Workbooks.Open($f, 0, $true)
    $gip = ReadSheet $wb.Sheets.Item('Input Daily All GIP') $bulan
    $lain = ReadSheet $wb.Sheets.Item('Input Daily') $bulan
    $wb.Close($false)

    $fuelUnit = @{}
    foreach ($k in $gip.Keys) { $fuelUnit[$k] = $gip[$k] }
    foreach ($k in $lain.Keys) { if (-not $fuelUnit.ContainsKey($k)) { $fuelUnit[$k] = $lain[$k] } }

    $rev = Get-Content $revPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $du = if (Test-Path $duPath) { Get-Content $duPath -Raw -Encoding UTF8 | ConvertFrom-Json } else { @() }
    $duByUnit = @{}
    foreach ($u in $du) { $duByUnit[(Key $u.Unit)] = $u }

    $old = 0.0; $new = 0.0; $ubah = 0; $hilang = @(); $tanpaHari = @()
    foreach ($d in $rev) {
      $k = Key $d.Unit
      $lamaFuel = [double]$d.Fuel
      $old += $lamaFuel
      $hm = [double]$d.HMTotal
      if (-not $fuelUnit.ContainsKey($k)) {
        $hilang += $d.Unit
        $d.Fuel = 0.0; $d.FuelRatio = 0
      } else {
        $harian = $fuelUnit[$k]
        $hariAda = @()
        if ($duByUnit.ContainsKey($k)) {
          # hari dianggap ada HANYA kalau HM/PA/idle dsb terisi (index 0..5);
          # index 6 = fuel, diabaikan supaya hitungan idempoten saat dijalankan ulang
          foreach ($p in $duByUnit[$k].D.PSObject.Properties) {
            $v = @($p.Value)
            for ($i = 0; $i -lt [math]::Min(6, $v.Count); $i++) {
              if ([double]$v[$i] -ne 0) { $hariAda += [int]$p.Name; break }
            }
          }
        }
        if (-not $hariAda.Count) {
          $hariAda = @($harian.Keys)
          if (-not $hariAda.Count) { $tanpaHari += $d.Unit }
        }
        $tot = 0.0
        foreach ($dd in $hariAda) { if ($harian.ContainsKey($dd)) { $tot += $harian[$dd] } }
        $d.Fuel = [math]::Round($tot, 1)
        $d.FuelRatio = if ($hm -gt 0) { [math]::Round($tot / $hm, 2) } else { 0 }
      }
      $new += [double]$d.Fuel
      if ([math]::Abs([double]$d.Fuel - $lamaFuel) -gt 0.05) { $ubah++ }
    }

    Write-Output ("[$mm] " + (Split-Path $f -Leaf))
    Write-Output ("     unit HE " + @($rev).Count + " | fuel lama " + [math]::Round($old, 1) + " L -> baru " + [math]::Round($new, 1) + " L | unit berubah " + $ubah + " | tanpa fuel di rekap " + $hilang.Count + " | tanpa hari HE " + $tanpaHari.Count)
    if ($hilang.Count) { Write-Output ("     tanpa fuel di rekap: " + ($hilang -join ', ')) }
    if ($tanpaHari.Count) { Write-Output ("     tanpa hari HE (dipakai sebulan penuh): " + ($tanpaHari -join ', ')) }

    if (-not $apply) { continue }

    Copy-Item $revPath "$revPath.bak" -Force
    Write-Text $revPath (ReviewJson $rev)
    if (Test-Path $duPath) {
      Copy-Item $duPath "$duPath.bak" -Force
      foreach ($u in $du) {
        $k = Key $u.Unit
        $harian = if ($fuelUnit.ContainsKey($k)) { $fuelUnit[$k] } else { @{} }
        # fuel harian hanya di hari yang ada HM-nya (0..5), hari lain dinolkan
        foreach ($p in $u.D.PSObject.Properties) {
          $dd = [int]$p.Name
          $v = @($p.Value)
          $adaHM = $false
          for ($i = 0; $i -lt [math]::Min(6, $v.Count); $i++) { if ([double]$v[$i] -ne 0) { $adaHM = $true; break } }
          $p.Value[6] = if ($adaHM -and $harian.ContainsKey($dd)) { [math]::Round($harian[$dd], 2) } else { 0 }
        }
      }
      $du | ConvertTo-Json -Depth 6 -Compress | Out-File -Encoding utf8 $duPath
    }

    # verifikasi: baca ulang file yang barusan ditulis
    $cek = Get-Content $revPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $sum = 0.0; foreach ($x in $cek) { $sum += [double]$x.Fuel }
    if ([math]::Abs($sum - [math]::Round($new, 1)) -gt 1) { throw "verifikasi gagal bulan $mm : $sum != $new" }
    Write-Output ("     tersimpan & terverifikasi: " + [math]::Round($sum, 1) + " L")
  }
} finally {
  try { $xl.Quit() } catch {}
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
if (-not $apply) { Write-Output 'DRY-RUN (tidak ada file diubah). Tambahkan -Apply untuk menulis.' }
