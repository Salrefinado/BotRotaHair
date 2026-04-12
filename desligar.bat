@echo off
title RotaHair - Desligar Sistema
color 0C

echo ==========================================
echo    A encerrar o Sistema RotaHair...
echo ==========================================
echo.

echo [1/3] A terminar processos do WhatsApp Bot (Node.js)...
taskkill /f /im node.exe /t > nul 2>&1

echo [2/3] A terminar processos da API (Python)...
taskkill /f /im python.exe /t > nul 2>&1

echo [3/3] A terminar o tunel Ngrok...
taskkill /f /im ngrok.exe /t > nul 2>&1

echo.
echo ==========================================
echo Sistema encerrado com sucesso!
echo ==========================================
echo.
echo Esta janela ira fechar em 3 segundos...
timeout /t 3 /nobreak > nul
exit