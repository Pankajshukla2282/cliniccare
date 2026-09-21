$ErrorActionPreference = "SilentlyContinue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Set-Location $RepoRoot

# ---------- Log folder ----------
$logDir = Join-Path $RepoRoot "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir "stop.log"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "       Stopping ClinicCare Environment        " -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host ""

# ============================================================
# 1. Stop Node processes associated with ClinicCare
# ============================================================

Write-Host "[CHECK] Looking for ClinicCare Node processes..."

$NodeProcesses = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq "node.exe" -and
        (
            $_.CommandLine -like "*dist\main.js*" -or
            $_.CommandLine -like "*dist/main.js*" -or
            $_.CommandLine -like "*apps/web*" -or
            $_.CommandLine -like "*apps\api*" -or
            $_.CommandLine -like "*tsx*watch*src\main.ts*" -or
            $_.CommandLine -like "*next*"
        )
    }

foreach ($Process in $NodeProcesses) {
    Write-Host "[STOP] Stopping node PID $($Process.ProcessId)..."

    Stop-Process `
        -Id $Process.ProcessId `
        -Force `
        -ErrorAction SilentlyContinue
}

# ============================================================
# 2. Stop npm processes belonging to the web
# ============================================================

Write-Host "[CHECK] Looking for ClinicCare npm processes..."

$NpmProcesses = Get-CimInstance Win32_Process |
    Where-Object {
        ($_.Name -eq "npm.cmd" -or $_.Name -eq "npm.exe") -and
        $_.CommandLine -like "*apps/web*"
    }

foreach ($Process in $NpmProcesses) {
    Write-Host "[STOP] Stopping npm PID $($Process.ProcessId)..."

    Stop-Process `
        -Id $Process.ProcessId `
        -Force `
        -ErrorAction SilentlyContinue
}

# ============================================================
# 3. Stop PostgreSQL kubectl port-forward (if the dev launcher owns it)
# ============================================================

Write-Host "[CHECK] Looking for kubectl port-forwards..."

$KubectlProcesses = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq "kubectl.exe" -and
        $_.CommandLine -like "*port-forward*"
    }

foreach ($Process in $KubectlProcesses) {
    Write-Host "[STOP] Stopping kubectl PID $($Process.ProcessId)..."

    Stop-Process `
        -Id $Process.ProcessId `
        -Force `
        -ErrorAction SilentlyContinue
}

# ============================================================
# 4. Verify ports
# ============================================================

Start-Sleep -Seconds 1

$Ports = @(5432, 6379, 3000, 3100)

foreach ($Port in $Ports) {

    $Connection = Get-NetTCPConnection `
        -LocalPort $Port `
        -State Listen `
        -ErrorAction SilentlyContinue

    if ($Connection) {
        Write-Host "[WARN] Port $Port is still listening." -ForegroundColor Yellow
    }
    else {
        Write-Host "[OK] Port $Port is free." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "[OK] ClinicCare local environment stopped." -ForegroundColor Green
Write-Host "Log file: $logFile" -ForegroundColor Cyan
Add-Content -Path $logFile -Value "ClinicCare shutdown at $(Get-Date)"
Write-Host ""
