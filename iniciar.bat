@echo off
title RotaHair - Inicializador e Instalador
color 0A

:: 1. Verificacao do Arquivo .env
if not exist .env (
    echo [ERRO] Arquivo .env nao encontrado!
    echo Por favor, crie o arquivo .env com suas chaves antes de iniciar.
    pause
    exit
)

:: 2. Configuracao de Modo (Visivel ou Fantasma)
set "CMD_MODE=1"
for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
    if "%%A"=="CMD" set "CMD_MODE=%%B"
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

:: 3. Instalacao Automatica de Dependencias
echo [PRE-START] Verificando ambiente...

:: Verificando Python e Venv
if not exist venv (
    echo [INSTALACAO] Criando ambiente virtual Python...
    python -m venv venv
)
echo [INSTALACAO] Atualizando dependencias Python...
call venv\Scripts\activate && pip install -q -r requirements.txt

:: Verificando Node.js e Modules
if not exist node_modules (
    echo [INSTALACAO] Instalando dependencias Node.js...
    call npm install
)

:: 4. Criacao de Atalhos na Area de Trabalho (Corrigido para OneDrive)
:: Busca o caminho real da pasta Desktop definida no Windows
for /f "delims=" %%i in ('powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')"') do set "DESKTOP_PATH=%%i"

set "SC_INICIAR=%DESKTOP_PATH%\RotaHair - Iniciar.lnk"
set "SC_DESLIGAR=%DESKTOP_PATH%\RotaHair - Desligar.lnk"

if not exist "%SC_INICIAR%" (
    echo [INSTALACAO] Criando atalhos na Area de Trabalho...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut(\"%SC_INICIAR%\");$s.TargetPath='%~dp0iniciar.bat';$s.WorkingDirectory='%~dp0';$s.Save()"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut(\"%SC_DESLIGAR%\");$s.TargetPath='%~dp0desligar.bat';$s.WorkingDirectory='%~dp0';$s.Save()"
)

echo.
if "%CMD_MODE%"=="0" goto MODO_FANTASMA

:MODO_NORMAL
echo [1/3] Iniciando a API Python (Minimizado)...
start "RotaHair - API Python" /min cmd /c "call venv\Scripts\activate && python api.py"
timeout /t 3 /nobreak > nul

echo [2/3] Iniciando o Bot do WhatsApp (Minimizado)...
start "RotaHair - Bot WhatsApp" /min cmd /c "node bot.js"
timeout /t 2 /nobreak > nul

echo [3/3] Iniciando o Tunel Ngrok (Minimizado)...
start "RotaHair - Ngrok" /min cmd /c "ngrok http --domain=kam-breezelike-carmelia.ngrok-free.dev 8000"

echo.
echo ==========================================
echo Tudo iniciado com sucesso!
echo ==========================================
echo.
echo Atalhos criados ou verificados na sua Area de Trabalho.
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