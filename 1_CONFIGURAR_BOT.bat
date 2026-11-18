@echo off
chcp 65001 >nul
title Configurar Poke-Discord Bot
cd /d "%~dp0"
node src/setup.js
echo.
pause
