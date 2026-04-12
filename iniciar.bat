@echo off
title RotaHair - Instalacao e Inicio Automatico
color 0A

:: ─────────────────────────────────────────────────────
:: Este arquivo e chamado pelo comando unico de setup.
:: Nao e necessario editar nada aqui.
:: ─────────────────────────────────────────────────────

if not exist .env (
    echo.
    echo [ERRO] Arquivo .env nao encontrado!
    echo Execute o comando de setup completo antes deste arquivo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    RotaHair - Instalacao Automatica
echo ==========================================
echo.

:: ── Lê variaveis do .env ──────────────────────────────
set "NGROK_AUTHTOKEN_VAL="
set "NGROK_DOMAIN_VAL="
set "CMD_VAL=1"
for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
    if /i "%%A"=="NGROK_AUTHTOKEN" set "NGROK_AUTHTOKEN_VAL=%%B"
    if /i "%%A"=="NGROK_DOMAIN"    set "NGROK_DOMAIN_VAL=%%B"
    if /i "%%A"=="CMD"             set "CMD_VAL=%%B"
)

:: ── 1. Dependencias base ──────────────────────────────
echo [1/5] Verificando Python, Node.js e Ngrok...

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo     Instalando Python...
    winget install --id Python.Python.3.13 -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo     [OK] Python ja instalado.
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo     Instalando Node.js...
    winget install --id OpenJS.NodeJS -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo     [OK] Node.js ja instalado.
)

where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo     Instalando Ngrok...
    winget install --id ngrok.ngrok -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo     [OK] Ngrok ja instalado.
)

:: ── 2. Ambiente Python ────────────────────────────────
echo.
echo [2/5] Configurando ambiente Python...
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate
pip install -q -r requirements.txt
echo     [OK] Dependencias Python instaladas.

:: ── 3. Dependencias Node ──────────────────────────────
echo.
echo [3/5] Instalando dependencias Node.js...
if not exist node_modules (
    call npm install --silent
)
echo     [OK] Dependencias Node instaladas.

:: ── 4. Atalhos e Inicializacao Automatica ────
echo.
echo [4/5] Criando atalhos e configurando inicializacao automatica...
for /f "delims=" %%i in ('powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')"') do set "DESK=%%i"
for /f "delims=" %%i in ('powershell -NoProfile -Command "[Environment]::GetFolderPath('Startup')"') do set "STARTUP=%%i"

:: Atalho para INICIAR na Area de Trabalho
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%DESK%\RotaHair - Iniciar.lnk');$s.TargetPath='%~dp0iniciar.bat';$s.WorkingDirectory='%~dp0';$s.IconLocation='%~dp0logo.ico';$s.Save()"

:: Atalho na pasta Inicializar (para ligar com o Windows)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%STARTUP%\RotaHair - AutoStart.lnk');$s.TargetPath='%~dp0iniciar.bat';$s.WorkingDirectory='%~dp0';$s.IconLocation='%~dp0logo.ico';$s.Save()"

:: Atalho para DESLIGAR
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%DESK%\RotaHair - Desligar.lnk');$s.TargetPath='%~dp0desligar.bat';$s.WorkingDirectory='%~dp0';$s.IconLocation='shell32.dll, 131';$s.Save()"

echo     [OK] Atalhos e Inicializacao Automatica configurados.

:: ── 5. Autentica Ngrok ────────────────────────────────
echo.
echo [5/5] Autenticando Ngrok...
if not "%NGROK_AUTHTOKEN_VAL%"=="" (
    ngrok config add-authtoken %NGROK_AUTHTOKEN_VAL% > nul 2>&1
    echo     [OK] Ngrok autenticado.
) else (
    echo     [AVISO] NGROK_AUTHTOKEN nao encontrado no .env.
)

:: ── Inicia o sistema ──────────────────────────────────
echo.
echo ==========================================
echo    Iniciando o sistema...
echo ==========================================
echo.

:: Define o prefixo de execução com base no modo (CMD=1 minimizado, CMD=0 fantasma/oculto)
set "START_PREFIX=start /min"
if "%CMD_VAL%"=="0" (
    set "START_PREFIX=powershell -NoProfile -WindowStyle Hidden -Command start-process -WindowStyle Hidden"
)

echo Iniciando API Python...
if "%CMD_VAL%"=="0" (
    powershell -NoProfile -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c call \"%~dp0venv\Scripts\activate\" && python \"%~dp0api.py\"' -WindowStyle Hidden"
) else (
    start "RotaHair - API" /min cmd /k "call "%~dp0venv\Scripts\activate" && python "%~dp0api.py""
)
timeout /t 4 /nobreak > nul

echo Iniciando Bot WhatsApp (aguarde o QR Code)...
:: O Bot WhatsApp sempre abre visivel para o QR Code, a menos que CMD=0
if "%CMD_VAL%"=="0" (
    powershell -NoProfile -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'bot.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
) else (
    start "RotaHair - Bot | QR Code aqui" cmd /k "cd /d "%~dp0" && node bot.js"
)
timeout /t 2 /nobreak > nul

echo Iniciando tunel Ngrok...
set "NGROK_CMD=ngrok http 8000"
if not "%NGROK_DOMAIN_VAL%"=="" (
    set "NGROK_CMD=ngrok http --domain=%NGROK_DOMAIN_VAL% 8000"
)

if "%CMD_VAL%"=="0" (
    powershell -NoProfile -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c %NGROK_CMD%' -WindowStyle Hidden"
) else (
    start "RotaHair - Ngrok" /min cmd /k "%NGROK_CMD%"
)

:: ── Abre o painel no browser ──────────────────────────
timeout /t 4 /nobreak > nul
echo Abrindo painel web...
start http://localhost:8000

echo.
echo ==========================================
echo Tudo pronto!
if "%CMD_VAL%"=="1" (
    echo Escaneie o QR Code que
    echo apareceu na janela "RotaHair - Bot".
)
echo O painel web tambem abriu no navegador.
echo ==========================================
timeout /t 5 /nobreak > nul
exit
