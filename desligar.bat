@echo off
title RotaHair - Desligar Sistema
color 0C

echo ==========================================
echo    A encerrar o Sistema RotaHair...
echo ==========================================
echo.

:: ── 1. Encerra os processos ───────────────────────
echo [1/3] A terminar processos do WhatsApp Bot (Node.js)...
taskkill /f /im node.exe /t > nul 2>&1

echo [2/3] A terminar processos da API (Python)...
taskkill /f /im python.exe /t > nul 2>&1

echo [3/3] A terminar o tunel Ngrok...
taskkill /f /im ngrok.exe /t > nul 2>&1

:: ── 2. Fecha as janelas CMD pelo titulo ───────────
echo [+] Fechando janelas do sistema...

taskkill /f /fi "WINDOWTITLE eq RotaHair - API" > nul 2>&1
taskkill /f /fi "WINDOWTITLE eq RotaHair - Bot | QR Code aqui" > nul 2>&1
taskkill /f /fi "WINDOWTITLE eq RotaHair - Ngrok" > nul 2>&1
taskkill /f /fi "WINDOWTITLE eq RotaHair - Bot" > nul 2>&1

:: ── 3. Garante fechamento via PowerShell (cobre modo minimizado e fantasma) ──
powershell -NoProfile -Command "Get-Process cmd,conhost -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like 'RotaHair*' } | Stop-Process -Force" > nul 2>&1

echo.
echo ==========================================
echo Sistema encerrado com sucesso!
echo ==========================================

timeout /t 3 /nobreak > nul
exit
