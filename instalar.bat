@echo off
title RotaHair - Instalador
color 0A

:: ══════════════════════════════════════════════════
::   PREENCHA SEUS DADOS AQUI (so uma vez)
:: ══════════════════════════════════════════════════
set "NUMERO_DONO="
set "NOME_DONO=Rodrigo"
set "NUMERO_TESTE="
set "ANTHROPIC_KEY="
set "GEMINI_API_KEY="
set "GOOGLE_CLIENT_ID="
set "GOOGLE_CLIENT_SECRET="
set "ADMIN_EMAIL="
set "ADMIN_PASSWORD="
set "NGROK_DOMAIN="
set "NGROK_AUTHTOKEN="

:: ══════════════════════════════════════════════════
::   NAO MEXA ABAIXO DESTA LINHA
:: ══════════════════════════════════════════════════

echo.
echo ==========================================
echo    Instalador do Sistema RotaHair
echo ==========================================
echo.
:: ── Verifica conexao com internet ─────────────────
ping -n 1 github.com >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Sem conexao com a internet!
    echo Conecte-se e tente novamente.
    pause
    exit /b 1
)

:: ── Baixa o projeto do GitHub ─────────────────────
echo [1/6] Baixando RotaHair do GitHub...

cd /d "%USERPROFILE%\Documents"

if exist BotRotaHair-main (
    echo     Removendo versao anterior...
    rmdir /s /q BotRotaHair-main > nul 2>&1
)
if exist rotahair.zip del /q rotahair.zip > nul 2>&1

curl -L --progress-bar -o rotahair.zip https://github.com/Salrefinado/BotRotaHair/archive/refs/heads/main.zip
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao baixar o projeto. Verifique sua conexao.
    pause
    exit /b 1
)

tar -xf rotahair.zip
del /q rotahair.zip

:: ── Trava de seguranca para evitar execucao na raiz ──
if not exist "BotRotaHair-main" (
    echo [ERRO] A pasta BotRotaHair-main nao foi encontrada apos a extracao!
    echo O download falhou ou o repositorio Salrefinado/BotRotaHair esta privado.
    pause
    exit /b 1
)
cd BotRotaHair-main

echo [OK] Projeto baixado em: %CD%

:: ── Cria o .env ───────────────────────────────────
echo.
echo [2/6] Configurando credenciais...
(
    echo NUMERO_DONO=%NUMERO_DONO%
    echo NOME_DONO=%NOME_DONO%
    echo NUMERO_TESTE=%NUMERO_TESTE%
    echo ANTHROPIC_KEY=%ANTHROPIC_KEY%
    echo GEMINI_API_KEY=%GEMINI_API_KEY%
    echo GOOGLE_CLIENT_ID=%GOOGLE_CLIENT_ID%
    echo GOOGLE_CLIENT_SECRET=%GOOGLE_CLIENT_SECRET%
    echo ADMIN_EMAIL=%ADMIN_EMAIL%
    echo ADMIN_PASSWORD=%ADMIN_PASSWORD%
    echo NGROK_DOMAIN=%NGROK_DOMAIN%
    echo NGROK_AUTHTOKEN=%NGROK_AUTHTOKEN%
    echo API_PORT=8000
    echo API_BASE_URL=http://localhost:8000
    echo TZ=America/Sao_Paulo
    echo CMD=1
) > .env
echo [OK] Arquivo .env criado.

:: ── Instala dependencias base ─────────────────────
echo.
echo [3/6] Verificando programas base (Python, Node.js, Ngrok)...

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo     Instalando Python...
    winget install --id Python.Python.3.13 -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo     [OK] Python ja esta instalado.
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo     Instalando Node.js...
    winget install --id OpenJS.NodeJS -e --source winget --accept-package-agreements --accept-source-agreements
) else (
    echo     [OK] Node.js ja esta instalado.
)

where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo     Baixando Ngrok direto do servidor oficial...
    curl -o ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip >nul 2>&1
    tar -xf ngrok.zip
    del ngrok.zip
    echo     [OK] Ngrok baixado na pasta.
) else (
    echo     [OK] Ngrok ja esta instalado.
)

:: ── Ambiente Python ───────────────────────────────
echo.
echo [4/6] Configurando ambiente Python...
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate
pip install -q -r requirements.txt
echo [OK] Dependencias Python instaladas.

:: ── Dependencias Node ─────────────────────────────
echo.
echo [5/6] Instalando dependencias Node.js...
if not exist node_modules (
    call npm install --silent
)
echo [OK] Dependencias Node instaladas.

:: ── Atalhos na Area de Trabalho ───────────────────
echo.
echo [6/6] Criando atalhos e autenticando Ngrok...
for /f "delims=" %%i in ('powershell -NoProfile -Command "[Environment]::GetFolderPath(\"Desktop\")"') do set "DESK=%%i"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%DESK%\RotaHair - Iniciar.lnk');$s.TargetPath='%CD%\iniciar.bat';$s.WorkingDirectory='%CD%';$s.Save()"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%DESK%\RotaHair - Desligar.lnk');$s.TargetPath='%CD%\desligar.bat';$s.WorkingDirectory='%CD%';$s.Save()"

if exist ngrok.exe (
    ngrok config add-authtoken %NGROK_AUTHTOKEN% > nul 2>&1
) else (
    call ngrok config add-authtoken %NGROK_AUTHTOKEN% > nul 2>&1
)
echo [OK] Atalhos criados. Ngrok autenticado.

:: ── Inicia o sistema ──────────────────────────────
echo.
echo ==========================================
echo    Instalacao concluida! Iniciando...
echo ==========================================
echo.
echo Iniciando API Python (minimizado)...
start "RotaHair - API" /min cmd /k "call "%CD%\venv\Scripts\activate" && python "%CD%\api.py""
timeout /t 4 /nobreak > nul

echo Iniciando Bot WhatsApp...
start "RotaHair - Bot | QR Code aqui" cmd /k "cd /d "%CD%" && node bot.js"
timeout /t 2 /nobreak > nul

echo Iniciando tunel Ngrok (minimizado)...
if exist ngrok.exe (
    start "RotaHair - Ngrok" /min cmd /k "ngrok.exe http --domain=%NGROK_DOMAIN% 8000"
) else (
    start "RotaHair - Ngrok" /min cmd /k "ngrok http --domain=%NGROK_DOMAIN% 8000"
)
timeout /t 4 /nobreak > nul

echo Abrindo painel web...
start http://localhost:8000

echo.
echo ==========================================
echo Tudo pronto!
echo Escaneie o QR Code na janela "RotaHair - Bot".
echo Da proxima vez use o atalho na Area de Trabalho.
echo ==========================================
echo.
timeout /t 8 /nobreak > nul
exit
