@echo off
setlocal
set "GIT_EXE=C:\Users\admin\.gemini\antigravity\bin\git\cmd\git.exe"
if not exist "%GIT_EXE%" (
    where git >nul 2>nul
    if %errorlevel% equ 0 (
        set "GIT_EXE=git"
    ) else (
        echo Error: No se encontro git.exe en el sistema.
        exit /b 1
    )
)

set "REMOTE_URL=%~1"
cd /d "%~dp0"

echo ===^> Comprobando estado de Git local en ProyectoIA...
"%GIT_EXE%" config user.name "ProyectoIA Developer"
"%GIT_EXE%" config user.email "dev@proyectoia.local"

if not exist ".git" (
    "%GIT_EXE%" init
    echo Repositorio inicializado.
)

"%GIT_EXE%" add .
"%GIT_EXE%" commit -m "feat: Lanzamiento inicial de ProyectoIA - Sistema de vision artificial robotica para frutillas Festival" 2>nul

if not "%REMOTE_URL%"=="" (
    echo Conectando con repositorio remoto: %REMOTE_URL%
    "%GIT_EXE%" remote remove origin 2>nul
    "%GIT_EXE%" remote add origin "%REMOTE_URL%"
    "%GIT_EXE%" branch -M main
    echo Subiendo codigo a GitHub...
    "%GIT_EXE%" push -u origin main
    if %errorlevel% equ 0 (
        echo [OK] Repositorio subido con exito a GitHub!
    ) else (
        echo [ERROR] Fallo al subir. Verifica la URL de GitHub y tus credenciales.
    )
) else (
    echo.
    echo Para subir el repositorio a GitHub, ejecuta pasando la URL de tu repositorio:
    echo   push_to_github.bat https://github.com/TU_USUARIO/ProyectoIA.git
)
