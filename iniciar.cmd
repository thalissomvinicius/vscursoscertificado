@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instale o Node.js 24 ou superior para executar o sistema.
  pause
  exit /b 1
)
echo VS Cursos - http://127.0.0.1:5174
echo Mantenha esta janela aberta enquanto usar o sistema.
node server.js
pause
