@echo off
title RotaHair - Instalador
color 0A

echo ==========================================
echo    Instalador do Sistema RotaHair
echo ==========================================
echo.
echo [1/5] Verificando programas base (Python, Node.js, Ngrok)...

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando Python...
    winget install --id Python.Python.3.13 -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo [OK] Python ja esta instalado.
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando Node.js...
    winget install --id OpenJS.NodeJS -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo [OK] Node.js ja esta instalado.
)

where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando Ngrok...
    winget install --id ngrok.ngrok -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo [OK] Ngrok ja esta instalado.
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
    echo NUMERO_DONO=> .env
    echo NOME_DONO=Rodrigo>> .env
    echo NUMERO_TESTE=>> .env
    echo ANTHROPIC_KEY=>> .env
    echo NGROK_DOMAIN=>> .env
    echo NGROK_AUTHTOKEN=>> .env
    echo CMD=1>> .env
    echo Arquivo .env criado com sucesso.
)

echo ==========================================
echo Instalacao concluida!
echo O arquivo .env sera aberto agora.
echo Preencha suas informacoes, salve e feche o bloco de notas.
echo Depois, basta usar o atalho "RotaHair - Iniciar" na Area de Trabalho.
echo ==========================================
pause
notepad .env
exit
