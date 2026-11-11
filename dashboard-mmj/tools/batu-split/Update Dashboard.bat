@echo off
title Update Dashboard Batu Split MMJ
cd /d "%~dp0"
echo ==================================================
echo   UPDATE DASHBOARD ANGKUTAN BATU SPLIT MMJ
echo   Pastikan file Excel database sudah DISIMPAN.
echo ==================================================
echo.
python "Dashboard Tools\update_dashboard.py"
if errorlevel 1 (
  echo.
  echo  GAGAL membuat dashboard. Lihat pesan di atas.
  pause
  exit /b 1
)
echo.
echo  Membuka dashboard...
start "" "Dashboard Angkutan Batu Split 2026.html"
timeout /t 4 >nul
