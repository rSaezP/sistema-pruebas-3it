@echo off
title Frontend Client - Puerto 5173
echo ================================================
echo          CLIENTE FRONTEND
echo ================================================
echo Iniciando cliente frontend en puerto 5173...
cd /d "%~dp0frontend"
npm run dev
pause