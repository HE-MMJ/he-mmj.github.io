@echo off
title Update Dashboard Gabungan MMJ
cd /d "%~dp0"
echo ==================================================
echo   UPDATE DASHBOARD GABUNGAN MMJ
echo   Batu Split + Loss Time + Rainfall (satu HTML)
echo   Pastikan file Excel sudah DISIMPAN.
echo ==================================================
echo.
python "Tools\build_gabungan.py"
if errorlevel 1 (
  echo.
  echo  Ada bagian yang GAGAL. Lihat pesan di atas.
  pause
)
echo.
echo  Membuka dashboard...
start "" "Dashboard MMJ 2026.html"
timeout /t 4 >nul
