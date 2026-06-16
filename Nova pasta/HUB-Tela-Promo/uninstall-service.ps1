# Powershell Script to uninstall "HUB - Tela Promo" Windows Service
# Must be run as Administrator

$ErrorActionPreference = "Stop"
$ServiceName = "HUB - Tela Promo"
$ProjectDir = $PSScriptRoot

# 1. Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Este script precisa ser executado como ADMINISTRADOR. Por favor, abra o PowerShell como Administrador e tente novamente."
    exit 1
}

Write-Host "=== Iniciando Desinstalacao do Servico: $ServiceName ===" -ForegroundColor Green

# 2. Check if NSSM exists
$nssmPath = Join-Path $ProjectDir "nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "NSSM nao encontrado na pasta do projeto. Tentando remover o servico diretamente via Windows PowerShell..." -ForegroundColor Yellow
    
    $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existingService) {
        if ($existingService.Status -eq "Running") {
            Stop-Service -Name $ServiceName -Force
        }
        # Remove using sc.exe
        sc.exe delete $ServiceName
        Write-Host "Servico removido." -ForegroundColor Green
    } else {
        Write-Host "Servico '$ServiceName' nao encontrado no sistema." -ForegroundColor Yellow
    }
    exit 0
}

# 3. Stop and remove the service using NSSM
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Parando o servico '$ServiceName'..." -ForegroundColor Yellow
    & $nssmPath stop $ServiceName | Out-Null
    
    Start-Sleep -Seconds 1
    
    Write-Host "Removendo o servico '$ServiceName' do Windows..." -ForegroundColor Yellow
    & $nssmPath remove $ServiceName confirm | Out-Null
    
    Write-Host "=== Servico desinstalado com sucesso! ===" -ForegroundColor Green
} else {
    Write-Host "O servico '$ServiceName' nao esta instalado no sistema." -ForegroundColor Yellow
}

# 4. Remove from Windows Add/Remove Programs (Programs and Features)
Write-Host "Removendo do Painel de Controle (Adicionar ou Remover Programas)..." -ForegroundColor Yellow
$RegistryPath = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\HUB-TelaPromo"
if (Test-Path $RegistryPath) {
    Remove-Item -Path $RegistryPath -Recurse -Force | Out-Null
}
