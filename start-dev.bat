@echo off
:start
echo ================================================
echo      SISTEMA DE PRUEBAS TÉCNICAS 3IT
echo      Backend y Frontend Separados
echo ================================================
echo.
echo Seleccione una opción:
echo 1. Iniciar Backend + Frontend (recomendado)
echo 2. Solo Backend (puerto 4000)
echo 3. Solo Frontend (puerto 5173)
echo 4. Salir
echo.
set /p choice="Ingrese su opción (1-4): "

if "%choice%"=="1" (
    echo Iniciando Backend y Frontend en terminales separadas...
    start "Backend Server" cmd /k "%~dp0start-backend.bat"
    timeout /t 3
    start "Frontend Client" cmd /k "%~dp0start-frontend.bat"
    echo Ambos servicios iniciados en terminales separadas.
    echo.
    echo URLs de acceso:
    echo Backend API: http://localhost:4000
    echo Frontend: http://localhost:5173
    echo.
) else if "%choice%"=="2" (
    start "Backend Server" cmd /k "%~dp0start-backend.bat"
    echo Backend iniciado en: http://localhost:4000
) else if "%choice%"=="3" (
    start "Frontend Client" cmd /k "%~dp0start-frontend.bat"
    echo Frontend iniciado en: http://localhost:5173
) else if "%choice%"=="4" (
    exit
) else (
    echo Opción inválida. Intente de nuevo.
    pause
    goto start
)
pause