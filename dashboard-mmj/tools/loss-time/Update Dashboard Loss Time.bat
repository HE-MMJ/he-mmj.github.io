@echo off
title Update Dashboard Loss Time ^& Curah Hujan MMJ
cd /d "%~dp0"
echo ==================================================
echo   UPDATE DASHBOARD LOSS TIME ^& CURAH HUJAN MMJ
echo   Pastikan file Excel Info stop Hauling sudah DISIMPAN.
echo   (membaca semua bulan: R_Adjust, selain itu R_nn tertinggi)
echo ==================================================
echo.
python "Dashboard Tools\update_dashboard_losstime.py"
if errorlevel 1 (
  echo.
  echo  GAGAL membuat dashboard. Lihat pesan di atas.
  pause
  exit /b 1
)
echo.
echo  Membuka dashboard...
start "" "Dashboard Loss Time & Curah Hujan 2026.html"
timeout /t 4 >nul
