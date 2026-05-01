@echo off
chcp 65001 >nul 2>&1
title Webyaz Restaurant - Kurulum
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║     🍽️  Webyaz Restaurant Otomasyon Sistemi          ║
echo  ║              KURULUM SIHIRBAZI                       ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ── Check Node.js ────────────────────────────────────────
echo  [1/4] Node.js kontrol ediliyor...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ⚠️  Node.js bulunamadi!
    echo  Node.js indiriliyor... Lutfen bekleyin.
    echo.
    echo  Tarayicinizda Node.js indirme sayfasi aciliyor...
    start https://nodejs.org/
    echo.
    echo  Node.js'i indirip kurduktan sonra bu dosyayi tekrar calistirin.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  ✅ Node.js bulundu: %NODE_VER%

:: ── Install Dependencies ─────────────────────────────────
echo.
echo  [2/4] Bagimliliklat yukleniyor (npm install)...
call npm install --production
if %ERRORLEVEL% NEQ 0 (
    echo  ❌ npm install basarisiz oldu!
    pause
    exit /b 1
)
echo  ✅ Bagimliliklar yuklendi!

:: ── Install PM2 ──────────────────────────────────────────
echo.
echo  [3/4] PM2 (oto-baslatma) kuruluyor...
call npm install -g pm2 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  ⚠️  PM2 kurulamadi (yonetici izni gerekebilir). Manuel baslatma kullanilacak.
) else (
    echo  ✅ PM2 kuruldu!
    :: Register with PM2
    pm2 delete webyaz-restaurant >nul 2>&1
    pm2 start server.js --name "webyaz-restaurant"
    pm2 save >nul 2>&1
    echo  ✅ Otomatik baslatma ayarlandi!
)

:: ── Create Desktop Shortcut ──────────────────────────────
echo.
echo  [4/4] Masaustu kisayolu olusturuluyor...
set SCRIPT_DIR=%~dp0
(
echo Set oWS = WScript.CreateObject("WScript.Shell"^)
echo sLinkFile = oWS.SpecialFolders("Desktop"^) ^& "\Webyaz Restaurant.lnk"
echo Set oLink = oWS.CreateShortcut(sLinkFile^)
echo oLink.TargetPath = "%SCRIPT_DIR%start.bat"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%"
echo oLink.Description = "Webyaz Restaurant Otomasyon Sistemi"
echo oLink.IconLocation = "%SystemRoot%\System32\SHELL32.dll,43"
echo oLink.Save
) > "%TEMP%\create_shortcut.vbs"
cscript //nologo "%TEMP%\create_shortcut.vbs"
del "%TEMP%\create_shortcut.vbs"
echo  ✅ Masaustu kisayolu olusturuldu!

:: ── Start Server ─────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║          ✅ KURULUM TAMAMLANDI!                      ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║  Sunucu baslatiliyor ve kurulum ekrani aciliyor...   ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: Start server and open browser
start /B node server.js
timeout /t 3 >nul
start http://localhost:3000/setup

echo  Sunucu calisiyor! Bu pencereyi kapatmayin.
echo  Kapatmak icin CTRL+C basin.
echo.

:: Keep window open
node server.js
