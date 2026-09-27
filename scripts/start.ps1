<#
.SYNOPSIS
ClinicCare Multi-Service Development Startup Script (Windows PowerShell)

.DESCRIPTION
Starts the ClinicCare local development environment consisting of:
- PostgreSQL (local or Kubernetes port-forward)
- NestJS API Service (apps/api or apps/auth as needed)
- Next.js Web App (apps/web)

Supports three infrastructure modes:
  - local:   Uses local PostgreSQL if reachable, otherwise auto-detects
  - k8s:     Uses Kubernetes cluster (requires kubectl + reachable cluster)
  - auto:    Auto-detects Kubernetes; falls back to local PostgreSQL

The script is idempotent - running it again when services are already running
is safe; it detects existing processes/ports and skips restart.

Prerequisites:
- Node.js: 24.21.0 (as declared in engines)
- npm: 11.x+
- PostgreSQL: 5432 (local or Kubernetes)
- .env file at repo root (copy from .env.example)

Configuration:
- .env file loaded first to ensure DATABASE_URL and all vars are set
- Environment mode: launcher param > .env APP_ENV > default development
- K8s namespace auto-detected based on environment
#>

$ErrorActionPreference = "Stop"

# ============================================================
# Repository Root Detection
# ============================================================
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

# ============================================================
# 1. Always load .env file first - ensures DATABASE_URL and all
#    other environment variables are set for child processes.
# ============================================================
Write-Host "[INFO] Loading .env..."

$EnvFile = Join-Path $RepoRoot ".env"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()

        if (
            $line -and
            -not $line.StartsWith("#") -and
            $line.Contains("=")
        ) {
            $parts = $line.Split("=", 2)

            $name = $parts[0].Trim()
            $value = $parts[1].Trim()

            # Remove surrounding quotes
            $value = $value.Trim('"').Trim("'")

            # Skip APP_ENV from .env if launcher already set it explicitly
            # (launcher has precedence for environment mode)
            if ($name -eq 'APP_ENV') {
                # Don't override - will handle determination after .env loading
            }
            else {
                [Environment]::SetEnvironmentVariable(
                    $name,
                    $value,
                    "Process"
                )
            }
        }
    }
}
else {
    Write-Host "[WARN] .env not found at $EnvFile" -ForegroundColor Yellow
    Write-Host "Copy .env.example to .env and configure required variables." -ForegroundColor Yellow
}

# ============================================================
# 2. Determine environment mode
#    - launch.ps1 -Environment param has highest precedence
#    - .env APP_ENV value is next
#    - Default to development
# ============================================================

# Check if launch.ps1 explicitly set the environment via -Environment param
$LauncherProvidedEnv = $false
if ($PSBoundParameters.ContainsKey('Environment') -and $Environment) {
    $AppEnvironment = $Environment
    $LauncherProvidedEnv = $true
    Write-Host "[PARAM] Environment overridden: $AppEnvironment"
}

# If launcher didn't provide an env, check .env / existing env vars
if (-not $LauncherProvidedEnv) {
    if ($env:APP_ENV) {
        $AppEnvironment = $env:APP_ENV
    }
    else {
        $AppEnvironment = 'development'
    }
}

# Output environment determination
if ($LauncherProvidedEnv) {
    Write-Host "[PARAM] Environment: $AppEnvironment"
}
elseif ($env:APP_ENV) {
    Write-Host "[ENV] Environment from .env: $AppEnvironment"
}
else {
    Write-Host "[DEFAULT] Environment: $AppEnvironment"
}

Write-Host ""

# ============================================================
# 3. Start PostgreSQL
# ============================================================
Write-Host "[INFO] PostgreSQL localhost:5432"

function Test-Port {
    param([int]$Port)
    try {
        $Conn = New-Object System.Net.Sockets.TcpClient
        $Async = $Conn.BeginConnect("127.0.0.1",$Port,$null,$null)
        $Success = $Async.AsyncWaitHandle.WaitOne(1000)
        if ($Success -and $Conn.Connected) {
            $Conn.Close()
            return $true
        }
        $Conn.Close()
        return $false
    } catch { return $false }
}

if (Test-Port 5432) {
    Write-Host "[OK] localhost:5432 already open." -ForegroundColor Green
}
elseif (-not (Test-Path "$RepoRoot\..\..\..\..\..\..\..\..\..\..\..\..\..\..\..\..\..\..\") ) {
    # In Kubernetes mode, PostgreSQL will be started via port-forward
    Write-Host "[INFO] PostgreSQL port-forward from K8s (if mode=k8s)"
}
else {
    Write-Host "[ERROR] PostgreSQL not listening on localhost:5432." -ForegroundColor Red
    Write-Host "Start PostgreSQL locally or set DEV_INFRA_MODE=k8s with reachable cluster." -ForegroundColor Red
    exit 1
}

# ============================================================
# 4. Start NestJS API Service
# ============================================================
Write-Host ""
Write-Host "[CHECK] API service (apps/api or apps/auth)..."

if (Test-Port 3100) {
    Write-Host "[OK] API already listening on port 3100." -ForegroundColor Green
}
else {
    Write-Host "[START] Starting NestJS API (workspace @cliniccare/api/ or @cliniccare/auth/)..."

    $env:NODE_ENV = if ($env:NODE_ENV) { $env:NODE_ENV } else { "development" }

    # Development uses tsx watch so stale/missing dist/ never prevents start
    $ApiProcess = Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @(
            "run", "dev",
            "--workspace=@cliniccare/api"
        ) `
        -RedirectStandardOutput "$RepoRoot\logs\api.log" `
        -RedirectStandardError "$RepoRoot\logs\api-error.log" `
        -PassThru -WindowStyle Hidden

    Write-Host "   API PID: " + $ApiProcess.Id
    Write-Host "[WAIT] Waiting for API on 127.0.0.1:3100..."

    $ApiReady = $false
    for ($i = 1; $i -le 60; $i++) {
        Start-Sleep -Seconds 1

        if (Test-Port 3100) {
            try {
                $Resp = Invoke-WebRequest -Uri "http://127.0.0.1:3100/api/v1/healthz" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
                if ($Resp.StatusCode -eq 200) {
                    Write-Host "[OK] API healthcheck passed." -ForegroundColor Green
                    $ApiReady = $true
                    break
                }
            }
            catch { /* API still starting */ }
        }

        if ($ApiProcess.HasExited) {
            Write-Host "[ERROR] API process exited." -ForegroundColor Red
            Write-Host ""
            Write-Host "== API Log =="
            if (Test-Path "$RepoRoot\logs\api.log") { Get-Content "$RepoRoot\logs\api.log" }
            if (Test-Path "$RepoRoot\logs\api-error.log") { Get-Content "$RepoRoot\logs\api-error.log" }
            Write-Host "============"
            exit 1
        }
    }

    if (-not $ApiReady) {
        Write-Host "[ERROR] API not healthy within 60 seconds." -ForegroundColor Red
        Write-Host ""
        Write-Host "== API Log =="
        if (Test-Path "$RepoRoot\logs\api.log") { Get-Content "$RepoRoot\logs\api.log" }
        if (Test-Path "$RepoRoot\logs\api-error.log") { Get-Content "$RepoRoot\logs\api-error.log" }
        Write-Host "============"
        exit 1
    }
}

# ============================================================
# 5. Start Next.js Web App
# ============================================================
Write-Host ""
Write-Host "[CHECK] Web application (apps/web)..."

if (Test-Port 3000) {
    Write-Host "[OK] Web already listening on port 3000." -ForegroundColor Green
}
else {
    Write-Host "[START] Starting Next.js Web App (workspace apps/web)..."

    $env:PORT = "3000"
    $env:HOST = "127.0.0.1"

    $WebProcess = Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @(
            "run", "dev",
            "--workspace=apps/web"
        ) `
        -RedirectStandardOutput "$RepoRoot\logs\web.log" `
        -RedirectStandardError "$RepoRoot\logs\web-error.log" `
        -PassThru -WindowStyle Hidden

    Write-Host "   Web PID: " + $WebProcess.Id
    Write-Host "[WAIT] Waiting for Web on 127.0.0.1:3000..."

    $WebReady = $false
    for ($i = 1; $i -le 120; $i++) {
        Start-Sleep -Seconds 1

        if (Test-Port 3000) {
            try {
                $Resp = Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
                if ($Resp.StatusCode -eq 200) {
                    Write-Host "[OK] Web healthcheck passed." -ForegroundColor Green
                    $WebReady = $true
                    break
                }
            }
            catch { /* Web still starting */ }
        }

        if ($WebProcess.HasExited) {
            Write-Host "[ERROR] Web process exited." -ForegroundColor Red
            Write-Host ""
            Write-Host "== Web Log =="
            if (Test-Path "$RepoRoot\logs\web.log") { Get-Content "$RepoRoot\logs\web.log" }
            if (Test-Path "$RepoRoot\logs\web-error.log") { Get-Content "$RepoRoot\logs\web-error.log" }
            Write-Host "============"
            exit 1
        }
    }

    if (-not $WebReady) {
        Write-Host "[ERROR] Web not healthy within 120 seconds." -ForegroundColor Red
        Write-Host ""
        Write-Host "== Web Log =="
        if (Test-Path "$RepoRoot\logs\web.log") { Get-Content "$RepoRoot\logs\web.log" }
        if (Test-Path "$RepoRoot\logs\web-error.log") { Get-Content "$RepoRoot\logs\web-error.log" }
        Write-Host "============"
        exit 1
    }
}

# ============================================================
# 6. Success output
# ============================================================
Write-Host ""
$successLine1 = "=============================================="
$successLine2 = "   ClinicCare local environment is running"
$successLine3 = "=============================================="
Write-Host $successLine1 -ForegroundColor Green
Write-Host $successLine2 -ForegroundColor Green
Write-Host $successLine3 -ForegroundColor Cyan
Write-Host ""
$pgLine = "PostgreSQL : localhost:5432"
$apiLine = "API        : 127.0.0.1:3100 (health: /api/v1/healthz)"
$webLine = "Web        : http://127.0.0.1:3000"
Write-Host $pgLine
Write-Host $apiLine
Write-Host $webLine
Write-Host ""
$ctrlLine = "Press Ctrl+C to stop the local environment."
Write-Host $ctrlLine
Write-Host ""

# ============================================================
# 7. Keep script alive + cleanup detection
# ============================================================
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 2

        # Detect stopped processes and log
        if ($ApiProcess -and ${ApiProcess}.HasExited) {
            Write-Host "[WARN] API process stopped unexpectedly." -ForegroundColor Yellow
        }

        if ($WebProcess -and ${WebProcess}.HasExited) {
            Write-Host "[WARN] Web process stopped unexpectedly." -ForegroundColor Yellow
        }

        if ($PostgresProcess -and ${PostgresProcess}.HasExited -and -not $UseK8s) {
            Write-Host "[WARN] PostgreSQL port-forward stopped." -ForegroundColor Yellow
        }
    }
}
finally {
    Write-Host ""
    $stopLine1 = "[STOP] Stopping ClinicCare local environment..."
    Write-Host $stopLine1

    if ($ApiProcess -and -not ${ApiProcess}.HasExited) {
        Stop-Process -Id $ApiProcess.Id -Force -ErrorAction SilentlyContinue
        $apiKillLine = "  API process killed."
        Write-Host $apiKillLine -ForegroundColor Cyan
    }

    if ($WebProcess -and -not ${WebProcess}.HasExited) {
        Stop-Process -Id $WebProcess.Id -Force -ErrorAction SilentlyContinue
        $webKillLine = "  Web process killed."
        Write-Host $webKillLine -ForegroundColor Cyan
    }

    if ($PostgresProcess -and -not $UseK8s -and -not ${PostgresProcess}.HasExited) {
        Stop-Process -Id $PostgresProcess.Id -Force -ErrorAction SilentlyContinue
        $pgKillLine = "  PostgreSQL port-forward stopped."
        Write-Host $pgKillLine -ForegroundColor Cyan
    }

    # Log completion
    Add-Content -Path $logFile -Value "ClinicCare startup completed at " + (Get-Date)
    $logCompleteLine = "[OK] ClinicCare stopped."
    Write-Host $logCompleteLine -ForegroundColor Green
    $logFileLine = "Log file: " + $logFile
    Write-Host $logFileLine -ForegroundColor Cyan
}