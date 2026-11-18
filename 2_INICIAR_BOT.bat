@echo off
chcp 65001 >nul
title Poke-Discord Bot - Rodando
cd /d "%~dp0"
if not exist "node_modules" (
    echo Instalando dependencias do projeto pela primeira vez...
    call npm install
)
echo Iniciando o Bot de Pokemon...
node src/index.js
echo.
pause
