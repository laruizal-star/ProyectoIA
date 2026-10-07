# Script para inicializar y publicar ProyectoIA en GitHub
param(
    [string]$RemoteUrl = ""
)

$gitPath = "C:\Users\admin\.gemini\antigravity\bin\git\cmd\git.exe"
if (!(Test-Path $gitPath)) {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $gitPath = "git"
    } else {
        Write-Error "No se encontró git.exe en el sistema."
        exit 1
    }
}

Write-Host "===> Verificando repositorio Git local en ProyectoIA..." -ForegroundColor Cyan
Set-Location -Path $PSScriptRoot

if (!(Test-Path ".git")) {
    & $gitPath init
    Write-Host "Repositorio Git inicializado localmente." -ForegroundColor Green
}

& $gitPath config user.name "ProyectoIA Developer"
& $gitPath config user.email "dev@proyectoia.local"

& $gitPath add .
& $gitPath commit -m "feat: Lanzamiento inicial de ProyectoIA - Sistema de visión artificial robótica para frutillas Festival"

Write-Host "`nArchivos confirmados en la rama principal." -ForegroundColor Green

if ($RemoteUrl -ne "") {
    Write-Host "Conectando con repositorio remoto: $RemoteUrl" -ForegroundColor Cyan
    & $gitPath remote remove origin 2>$null
    & $gitPath remote add origin $RemoteUrl
    & $gitPath branch -M main
    Write-Host "Subiendo código a GitHub..." -ForegroundColor Cyan
    & $gitPath push -u origin main
    Write-Host "¡Repositorio subido con éxito a GitHub!" -ForegroundColor Green
} else {
    Write-Host "`nPara conectar tu repositorio remoto de GitHub, ejecuta:" -ForegroundColor Yellow
    Write-Host "  .\push_to_github.ps1 -RemoteUrl 'https://github.com/TU_USUARIO/ProyectoIA.git'" -ForegroundColor White
}
