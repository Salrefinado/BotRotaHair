@echo off
title RotaHair - Inicializador
color 0A

:: 1. Verificacao do Arquivo .env
if not exist .env (
    echo [ERRO] Arquivo .env nao encontrado!
    echo Por favor, execute o 'instalar.bat' primeiro ou crie o arquivo .env com suas chaves antes de iniciar.
    pause
    exit
)

:: 2. Configuracao de Modo e Tokens
set "CMD_MODE=1"
set "NGROK_AUTHTOKEN="
for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
    if "%%A"=="CMD" set "CMD_MODE=%%B"
    if "%%A"=="NGROK_AUTHTOKEN" set "NGROK_AUTHTOKEN=%%B"
)

echo ==========================================
echo    Iniciando o Sistema RotaHair...
if "%CMD_MODE%"=="0" (
    echo    Modo: FANTASMA (Oculto)
) else (
    echo    Modo: JANELAS MINIMIZADAS
)
echo ==========================================
echo.

:: 3. Configurar Ngrok Authtoken
if not "%NGROK_AUTHTOKEN%"=="" (
    echo [Config] Autenticando Ngrok...
    ngrok config add-authtoken %NGROK_AUTHTOKEN% > nul 2>&1
) else (
    echo [Aviso] NGROK_AUTHTOKEN nao encontrado no .env.
)

if "%CMD_MODE%"=="0" goto MODO_FANTASMA

:MODO_NORMAL
echo [1/3] Iniciando a API Python (Minimizado)...
start "RotaHair - API Python" /min cmd /k "call venv\Scripts\activate && python api.py"
timeout /t 3 /nobreak > nul

echo [2/3] Iniciando o Bot do WhatsApp (Minimizado)...
start "RotaHair - Bot WhatsApp" /min cmd /k "node bot.js"
timeout /t 2 /nobreak > nul

echo [3/3] Iniciando o Tunel Ngrok (Minimizado)...
start "RotaHair - Ngrok" /min cmd /k "ngrok http --domain=kam-breezelike-carmelia.ngrok-free.dev 8000"

echo.
echo ==========================================
echo Tudo iniciado com sucesso!
echo ==========================================
echo.
goto FIM

:MODO_FANTASMA
echo [1/3] Iniciando a API Python em segundo plano...
echo Set WshShell = CreateObject("WScript.Shell") > run_api.vbs
echo WshShell.Run "cmd /c call venv\Scripts\activate && python api.py", 0, False >> run_api.vbs
cscript //nologo run_api.vbs
del run_api.vbs
timeout /t 3 /nobreak > nul

echo [2/3] Iniciando o Bot do WhatsApp em segundo plano...
echo Set WshShell = CreateObject("WScript.Shell") > run_bot.vbs
echo WshShell.Run "cmd /c node bot.js", 0, False >> run_bot.vbs
cscript //nologo run_bot.vbs
del run_bot.vbs
timeout /t 2 /nobreak > nul

echo [3/3] Iniciando o Tunel Ngrok em segundo plano...
echo Set WshShell = CreateObject("WScript.Shell") > run_ngrok.vbs
echo WshShell.Run "cmd /c ngrok http --domain=kam-breezelike-carmelia.ngrok-free.dev 8000", 0, False >> run_ngrok.vbs
cscript //nologo run_ngrok.vbs
del run_ngrok.vbs

echo.
echo ==========================================
echo Tudo iniciado com sucesso no MODO FANTASMA!
echo ==========================================
echo.
echo Utilize o 'desligar.bat' para parar o sistema.

:FIM
echo Esta janela fechara sozinha em 5 segundos...
timeout /t 5 /nobreak > nul
exit
