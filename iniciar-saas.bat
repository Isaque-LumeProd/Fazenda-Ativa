@echo off
title AgroRancho SaaS - Servidor Local (PC + iPhone)
cd /d "%~dp0"
echo Iniciando servidor AgroRancho SaaS...
start "" http://localhost:3000
node server.js
pause
