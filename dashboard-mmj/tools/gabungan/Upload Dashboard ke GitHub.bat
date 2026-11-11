@echo off
title Upload Dashboard MMJ ke GitHub
cd /d "%~dp0"
echo ==================================================
echo   UPDATE + UPLOAD DASHBOARD MMJ KE GITHUB
echo   1. Update Coal Hauling, Batu Split, Loss Time, Gabungan
echo   2. Upload ke https://he-mmj.github.io/ (halaman utama + dashboard-mmj)
echo   Pastikan semua file Excel sudah DISIMPAN.
echo ==================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "Tools\upload_github.ps1" %*
echo.
pause
