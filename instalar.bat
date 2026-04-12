@echo off
setlocal enabledelayedexpansion
title RotaHair - Instalador
color 0A

echo ==========================================
echo    Instalador do Sistema RotaHair
echo ==========================================
echo.
echo [1/5] Verificando programas base (Python, Node.js, Ngrok)...

set "RELOAD_PATH=0"

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando Python...
    winget install --id Python.Python.3.13 -e --source winget --accept-package-agreements --accept-source-agreements
    set "RELOAD_PATH=1"
) else (
    echo [OK] Python ja esta instalado.
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando Node.js...
    winget install --id OpenJS.NodeJS -e --source winget --accept-package-agreements --accept-source-agreements
    set "RELOAD_PATH=1"
) else (
    echo [OK] Node.js ja esta instalado.
)

where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando Ngrok...
    winget install --id ngrok.ngrok -e --source winget --accept-package-agreements --accept-source-agreements
    set "RELOAD_PATH=1"
) else (
    echo [OK] Ngrok ja esta instalado.
)

:: Se algo foi instalado, atualiza o PATH na sessao atual para nao precisar reiniciar o PC
if "%RELOAD_PATH%"=="1" (
    echo Atualizando variaveis de ambiente...
    for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%B"
    for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USR_PATH=%%B"
    set "PATH=!SYS_PATH!;!USR_PATH!;%PATH%"
)

echo.
echo [2/5] Configurando ambiente Python (venv)...
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate
pip install -q -r requirements.txt

echo.
echo [3/5] Instalando dependencias do Node.js...
if not exist node_modules (
    call npm install
)

echo.
echo [4/5] Criando atalhos na Area de Trabalho...
for /f "delims=" %%i in ('powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')"') do set "DESKTOP_PATH=%%i"
set "SC_INICIAR=%DESKTOP_PATH%\RotaHair - Iniciar.lnk"
set "SC_DESLIGAR=%DESKTOP_PATH%\RotaHair - Desligar.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut(\"%SC_INICIAR%\");$s.TargetPath='%~dp0iniciar.bat';$s.WorkingDirectory='%~dp0';$s.Save()"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut(\"%SC_DESLIGAR%\");$s.TargetPath='%~dp0desligar.bat';$s.WorkingDirectory='%~dp0';$s.Save()"

echo.
echo [5/5] Configurando arquivo .env...
if not exist .env (
    echo Vamos configurar as suas chaves agora.
    set /p NUM_DONO="Digite o seu numero do WhatsApp (ex: 5541999999999): "
    set /p NOME_DON="Digite o seu nome: "
    set /p ANT_KEY="Cole a sua ANTHROPIC_KEY (sk-ant-...): "
    set /p NGRK_DOM="Cole o seu NGROK_DOMAIN (sem https://): "
    set /p NGRK_AUTH="Cole o seu NGROK_AUTHTOKEN: "

    echo NUMERO_DONO=!NUM_DONO!> .env
    echo NOME_DONO=!NOME_DON!>> .env
    echo NUMERO_TESTE=>> .env
    echo ANTHROPIC_KEY=!ANT_KEY!>> .env
    echo NGROK_DOMAIN=!NGRK_DOM!>> .env
    echo NGROK_AUTHTOKEN=!NGRK_AUTH!>> .env
    echo CMD=1>> .env
    echo.
    echo Arquivo .env criado e configurado com sucesso!
) else (
    echo [OK] Arquivo .env ja existe.
)

echo.
echo ==========================================
echo Instalacao concluida! O sistema ja pode ser iniciado.
echo ==========================================
echo.
echo Pressione qualquer tecla para abrir o RotaHair agora...
pause >nul
start "" "%SC_INICIAR%"
exit
