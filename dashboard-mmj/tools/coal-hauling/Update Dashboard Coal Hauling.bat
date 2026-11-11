@echo off
title Update Dashboard Coal Hauling MMJ
cd /d "%~dp0"
echo ==================================================
echo   UPDATE DASHBOARD COAL HAULING MMJ
echo   Sumber: file "MMJ Daily Report (Dashboard)" terbaru
echo   di folder bulan terbaru (01. Dashboard).
echo   Pastikan file Excel sudah DISIMPAN.
echo ==================================================
echo.
python "Dashboard Tools\update_dashboard_hauling.py"
if errorlevel 1 (
  echo.
  echo  GAGAL membuat dashboard. Lihat pesan di atas.
  pause
  exit /b 1
)
echo.
echo  Membuka dashboard...
start "" "Dashboard Coal Hauling 2026.html"
timeout /t 4 >nul
