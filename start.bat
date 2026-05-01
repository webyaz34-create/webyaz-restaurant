@echo off
chcp 65001 >nul 2>&1
title Webyaz Restaurant
color 0A

echo.
echo  🍽️  Webyaz Restaurant Otomasyon Sistemi baslatiliyor...
echo.

:: Check if PM2 is running
where pm2 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    pm2 restart webyaz-restaurant >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo  ✅ Sunucu PM2 ile baslatildi!
        timeout /t 2 >nul
        start http://localhost:3000
        echo  Tarayiciniz acildi. Bu pencereyi kapatabilirsiniz.
        pause
        exit /b 0
    )
)

:: Fallback: start directly
echo  Sunucu baslatiliyor...
start http://localhost:3000
node server.js
