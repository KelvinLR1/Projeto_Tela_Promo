# Powershell Script to install "HUB - Tela Promo" as a Windows Service
# Must be run as Administrator

$ErrorActionPreference = "Stop"
$ServiceName = "HUB - Tela Promo"
$ServiceDisplayName = "HUB - Tela Promo"
$ServiceDescription = "Serviço de exibição de promoções na tela do supermercado"
$ProjectDir = $PSScriptRoot

# 1. Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Este script precisa ser executado como ADMINISTRADOR. Por favor, abra o PowerShell como Administrador e tente novamente."
    exit 1
}

Write-Host "=== Iniciando Instalacao do Servico: $ServiceDisplayName ===" -ForegroundColor Green
Write-Host "Diretorio do Projeto: $ProjectDir"

# 2. Find node.exe path (checking portable version first)
$nodePath = ""
$portableNode = Join-Path $ProjectDir "bin\node.exe"
$isPortable = $false

if (Test-Path $portableNode) {
    $nodePath = $portableNode
    $isPortable = $true
    Write-Host "Node.exe PORTATIL detectado em: $nodePath" -ForegroundColor Green
} else {
    $nodePath = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if (-not $nodePath) {
        # Fallback to default install path
        if (Test-Path "$env:ProgramFiles\nodejs\node.exe") {
            $nodePath = "$env:ProgramFiles\nodejs\node.exe"
        } else {
            Write-Error "Node.js nao foi detectado no sistema e nenhuma versao portatil foi encontrada em 'bin\node.exe'. Instale o Node.js antes de prosseguir."
            exit 1
        }
    }
    Write-Host "Node.exe do sistema encontrado em: $nodePath"
}

# 3. Install production dependencies (skip if portable/already packaged and node_modules exists)
$nodeModulesPath = Join-Path $ProjectDir "node_modules"
if ($isPortable -and (Test-Path $nodeModulesPath)) {
    Write-Host "Modo Portatil ativo: pulando instalacao de dependencias (npm install) ja que 'node_modules' esta presente." -ForegroundColor Green
} else {
    if ($isPortable) {
        Write-Host "Modo Portatil detectado, mas 'node_modules' nao esta presente. Tentando instalar..." -ForegroundColor Yellow
    } else {
        Write-Host "Instalando dependencias de producao (npm install)..." -ForegroundColor Yellow
    }
    
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmCmd) {
        cd $ProjectDir
        & npm install --omit=dev
    } else {
        if (-not (Test-Path $nodeModulesPath)) {
            Write-Error "Pasta 'node_modules' esta faltando e o comando 'npm' nao esta disponivel neste sistema para realiza-la."
            exit 1
        }
        Write-Host "Utilizando pasta 'node_modules' ja existente (npm nao disponivel)." -ForegroundColor Green
    }
}

# 4. Download and setup NSSM if not present
$nssmPath = Join-Path $ProjectDir "nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "Baixando o NSSM (Service Manager) para instalacao do servico..." -ForegroundColor Yellow
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $zipUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $zipPath = Join-Path $ProjectDir "nssm.zip"
    $extractDir = Join-Path $ProjectDir "nssm_temp"

    # Download
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

    # Extract
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

    # Copy 64bit executable
    $extractedNssm = Join-Path $extractDir "nssm-2.24\win64\nssm.exe"
    if (Test-Path $extractedNssm) {
        Copy-Item -Path $extractedNssm -Destination $nssmPath -Force
    } else {
        # Fallback to win32 if win64 is missing (unlikely)
        Copy-Item -Path (Join-Path $extractDir "nssm-2.24\win32\nssm.exe") -Destination $nssmPath -Force
    }

    # Cleanup temp download files
    Remove-Item -Path $zipPath -Force
    Remove-Item -Path $extractDir -Recurse -Force
}
Write-Host "NSSM pronto em: $nssmPath"

# 5. Check if service already exists and stop it
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Servico ja existente detectado. Parando o servico para atualizacao..." -ForegroundColor Yellow
    & $nssmPath stop $ServiceName | Out-Null
    & $nssmPath remove $ServiceName confirm | Out-Null
    Start-Sleep -Seconds 2
}

# 6. Install the Service using NSSM
Write-Host "Registrando o servico '$ServiceDisplayName' no Windows..." -ForegroundColor Yellow
& $nssmPath install $ServiceName $nodePath "server.js" | Out-Null
& $nssmPath set $ServiceName AppDirectory $ProjectDir | Out-Null
& $nssmPath set $ServiceName DisplayName $ServiceDisplayName | Out-Null
& $nssmPath set $ServiceName Description $ServiceDescription | Out-Null
& $nssmPath set $ServiceName Start SERVICE_AUTO_START | Out-Null

# Setup restart policy (automatic restart on crash)
& $nssmPath set $ServiceName AppExit Default Restart | Out-Null
& $nssmPath set $ServiceName AppThrottle 1500 | Out-Null

# Redirect output logs for monitoring
$logDir = Join-Path $ProjectDir "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
}
& $nssmPath set $ServiceName AppStdout (Join-Path $logDir "service-stdout.log") | Out-Null
& $nssmPath set $ServiceName AppStderr (Join-Path $logDir "service-stderr.log") | Out-Null

# 7. Start the Service
Write-Host "Iniciando o servico '$ServiceDisplayName'..." -ForegroundColor Yellow
& $nssmPath start $ServiceName | Out-Null

Start-Sleep -Seconds 2
$serviceStatus = Get-Service -Name $ServiceName

if ($serviceStatus.Status -eq "Running") {
    # 8. Register in Windows Add/Remove Programs (Programs and Features)
    Write-Host "Registrando no Painel de Controle (Adicionar ou Remover Programas)..." -ForegroundColor Yellow
    $RegistryPath = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\HUB-TelaPromo"
    if (-not (Test-Path $RegistryPath)) {
        New-Item -Path $RegistryPath -Force | Out-Null
    }
    Set-ItemProperty -Path $RegistryPath -Name "DisplayName" -Value "HUB - Tela Promo"
    Set-ItemProperty -Path $RegistryPath -Name "UninstallString" -Value "cmd.exe /c `"$ProjectDir\desinstalar-servico.bat`""
    Set-ItemProperty -Path $RegistryPath -Name "Publisher" -Value "KelvinLR1"
    Set-ItemProperty -Path $RegistryPath -Name "DisplayVersion" -Value "1.0.0"
    Set-ItemProperty -Path $RegistryPath -Name "InstallLocation" -Value $ProjectDir
    Set-ItemProperty -Path $RegistryPath -Name "DisplayIcon" -Value "shell32.dll,15"
    Set-ItemProperty -Path $RegistryPath -Name "NoModify" -Value 1 -Type DWord
    Set-ItemProperty -Path $RegistryPath -Name "NoRepair" -Value 1 -Type DWord

    Write-Host "=== Servico instalado e rodando com sucesso! ===" -ForegroundColor Green
    Write-Host "Acesse o painel em http://localhost:3000" -ForegroundColor Green
} else {
    Write-Error "O servico foi instalado mas falhou ao iniciar. Verifique os arquivos em '$logDir' para mais detalhes."
}
