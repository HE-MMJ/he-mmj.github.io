# Update semua dashboard MMJ lalu upload ke GitHub Pages
# Repo  : HE-MMJ/he-mmj.github.io  (folder dashboard-mmj/ saja; file lain di repo tidak disentuh)
# Online: https://he-mmj.github.io/dashboard-mmj/
param([switch]$TanpaGenerate)

$ErrorActionPreference = 'Stop'
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")

$R    = 'D:\01. ENGINEERING MMJ\9. MMJ 2026\02. MMJ Report\01. Daily Report'
$GAB  = "$R\01. Dashboard\00. Dashboard HTML Gabungan"
$CH   = "$R\01. Dashboard\00. Dashboard Coal Hauling"
$BS   = "$R\06. Rock\01. Input Daily"
$LT   = "$R\03. Rainfall"
$REPO = "$GAB\GitHub\he-mmj.github.io"
$D    = "$REPO\dashboard-mmj"

function Langkah($t) { Write-Host ""; Write-Host ">> $t" -ForegroundColor Cyan }
function Gagal($t)   { Write-Host ""; Write-Host "GAGAL: $t" -ForegroundColor Red; exit 1 }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Gagal "Git belum terpasang." }

# ---------- 1. Generate ulang dashboard dari Excel terbaru ----------
if (-not $TanpaGenerate) {
    $gen = @(
        @{ n = "Coal Hauling"; dir = $CH;  py = "Dashboard Tools\update_dashboard_hauling.py" },
        @{ n = "Batu Split";   dir = $BS;  py = "Dashboard Tools\update_dashboard.py" },
        @{ n = "Loss Time";    dir = $LT;  py = "Dashboard Tools\update_dashboard_losstime.py" },
        @{ n = "Gabungan";     dir = $GAB; py = "Tools\build_gabungan.py" }
    )
    foreach ($g in $gen) {
        Langkah "Update dashboard $($g.n)..."
        Push-Location $g.dir
        try {
            & python $g.py
            if ($LASTEXITCODE -ne 0) { Gagal "generator $($g.n) error (lihat pesan di atas). Upload dibatalkan." }
        } finally { Pop-Location }
    }
}

# ---------- 2. Siapkan salinan repo ----------
Langkah "Mengambil versi terbaru repo dari GitHub..."
if (-not (Test-Path "$REPO\.git")) {
    New-Item -ItemType Directory -Force "$GAB\GitHub" | Out-Null
    git clone https://github.com/HE-MMJ/he-mmj.github.io.git "$REPO"
    if ($LASTEXITCODE -ne 0) { Gagal "clone repo." }
}
Set-Location $REPO
git pull --rebase --autostash -q origin main
if ($LASTEXITCODE -ne 0) { Gagal "git pull. Cek koneksi internet / login GitHub (gh auth login)." }

# ---------- 3. Salin file ----------
Langkah "Menyalin file dashboard..."
foreach ($x in "$D","$D\tools\gabungan","$D\tools\coal-hauling\logos","$D\tools\batu-split","$D\tools\loss-time") {
    New-Item -ItemType Directory -Force $x | Out-Null
}
Copy-Item "$GAB\Dashboard MMJ 2026.html"                    "$D\index.html"        -Force
Copy-Item "$CH\Dashboard Coal Hauling 2026.html"            "$D\coal-hauling.html" -Force
Copy-Item "$BS\Dashboard Angkutan Batu Split 2026.html"     "$D\batu-split.html"   -Force
Copy-Item "$LT\Dashboard Loss Time & Curah Hujan 2026.html" "$D\loss-time.html"    -Force

Copy-Item "$GAB\Update Dashboard Gabungan.bat", "$GAB\Upload Dashboard ke GitHub.bat", "$GAB\Tools\build_gabungan.py", "$GAB\Tools\exec_template.html", "$GAB\Tools\shell_template.html", "$GAB\Tools\upload_github.ps1" "$D\tools\gabungan" -Force
Copy-Item "$CH\Update Dashboard Coal Hauling.bat", "$CH\Dashboard Tools\update_dashboard_hauling.py", "$CH\Dashboard Tools\hauling_template.html", "$CH\Dashboard Tools\target_rkap.json", "$CH\Dashboard Tools\logo_mmj.png" "$D\tools\coal-hauling" -Force
Copy-Item "$CH\Dashboard Tools\logos\*.png" "$D\tools\coal-hauling\logos" -Force
Copy-Item "$BS\Update Dashboard.bat", "$BS\Dashboard Tools\update_dashboard.py", "$BS\Dashboard Tools\dashboard_template.html", "$BS\Dashboard Tools\logo_mmj.png" "$D\tools\batu-split" -Force
Copy-Item "$LT\Update Dashboard Loss Time.bat", "$LT\Dashboard Tools\update_dashboard_losstime.py", "$LT\Dashboard Tools\losstime_template.html", "$LT\Dashboard Tools\logo_mmj.png" "$D\tools\loss-time" -Force

# ---------- 4. Commit & push ----------
git add -- dashboard-mmj
git diff --cached --quiet -- dashboard-mmj
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Tidak ada perubahan - dashboard online sudah sama dengan versi terbaru." -ForegroundColor Yellow
    exit 0
}
Langkah "Upload ke GitHub..."
$tgl = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -q -m "Update Dashboard MMJ $tgl" -- dashboard-mmj
if ($LASTEXITCODE -ne 0) { Gagal "git commit." }
git push -q origin main
if ($LASTEXITCODE -ne 0) { Gagal "git push. Cek koneksi internet / login GitHub (gh auth login)." }

Write-Host ""
Write-Host "BERHASIL diupload ($tgl)." -ForegroundColor Green
Write-Host "Online dalam +-1 menit: https://he-mmj.github.io/dashboard-mmj/"
exit 0
