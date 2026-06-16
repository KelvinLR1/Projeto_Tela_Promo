@echo off
:: Force running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ================================================================
    echo ATENCAO: Este script precisa ser executado como ADMINISTRADOR.
    echo.
    echo Por favor, clique com o botao direito neste arquivo e selecione:
    echo "Executar como Administrador"
    echo ================================================================
    pause
    exit /b
)

echo.
echo === INSTALANDO HUB - TELA PROMO COMO SERVICO DO WINDOWS ===
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-service.ps1"

echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
