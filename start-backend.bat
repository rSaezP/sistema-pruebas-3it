@echo off
title Backend Server - Puerto 4000
echo ================================================
echo          SERVIDOR BACKEND
echo ================================================
echo Limpiando procesos anteriores...
taskkill /IM node.exe /F 2>nul
timeout /t 2
echo Iniciando servidor backend en puerto 4000...
cd /d "%~dp0backend"
npm run dev
pause