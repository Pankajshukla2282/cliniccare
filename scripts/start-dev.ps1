$ErrorActionPreference = "Stop"

# ============================================================
# ClinicCare Windows Development Startup
# ============================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Set-Location $RepoRoot

# ---------- Log folder ----------
$logDir = Join-Path $RepoRoot "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir "startup.log"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "     ClinicCare Windows Development Start     " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Repo root: $RepoRoot"
Write-Host ""

# ============================================================
# 1. Load .env
# ============================================================

$EnvFile = Join-Path $RepoRoot ".env"

if (Test-Path $EnvFile) {
    Write-Host "[INFO] Loading .env..."

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

            [Environment]::SetEnvironmentVariable(
                $name,
                $value,
                "Process"
            )
        }
    }
}
else {
    Write-Host "[WARN] .env not found" -ForegroundColor Yellow
}

if (-not $env:DATABASE_URL) {
    Write-Host "[ERROR] DATABASE_URL is not configured. Copy .env.example to .env and configure it." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] DATABASE_URL configured."

# Dynamic local runtime configuration (root .env)
$ApiHost = if ($env:API_HOST) { $env:API_HOST } else { '127.0.0.1' }
$ApiPort = if ($env:API_PORT) { [int]$env:API_PORT } else { 3100 }
$WebHost = if ($env:WEB_HOST) { $env:WEB_HOST } else { '127.0.0.1' }
$WebPort = if ($env:WEB_PORT) { [int]$env:WEB_PORT } else { 3000 }
$PostgresLocalPort = if ($env:POSTGRES_LOCAL_PORT) { [int]$env:POSTGRES_LOCAL_PORT } else { 5432 }
$AppEnvironment = if ($env:APP_ENV) { $env:APP_ENV } else { 'development' }
$K8sNamespace = if ($env:K8S_NAMESPACE) { $env:K8S_NAMESPACE } else { "cliniccare-$AppEnvironment" }
$InfraMode = if ($env:DEV_INFRA_MODE) { ($env:DEV_INFRA_MODE).ToLowerInvariant() } else { 'auto' }
$PostgresService = if ($env:POSTGRES_SERVICE) { $env:POSTGRES_SERVICE } else { 'postgres' }
$ApiHealthPath = if ($env:API_HEALTH_PATH) { $env:API_HEALTH_PATH } else { '/healthz' }
$WebHealthPath = if ($env:WEB_HEALTH_PATH) { $env:WEB_HEALTH_PATH } else { '/healthz' }
$ApiUrl = if ($env:API_URL) { $env:API_URL } else { "http://localhost:$ApiPort" }

Write-Host "[CONFIG] API   : $ApiHost`:$ApiPort"
Write-Host "[CONFIG] Web   : $WebHost`:$WebPort"
Write-Host "[CONFIG] DB    : localhost`:$PostgresLocalPort"
Write-Host "[CONFIG] Env   : $AppEnvironment"
Write-Host "[CONFIG] K8s   : $K8sNamespace"
Write-Host "[CONFIG] Infra : $InfraMode (local | k8s | auto)"
Write-Host ""

# ============================================================
# 2. Check required commands
# ============================================================

Write-Host "[CHECK] Checking required commands..."

$Commands = @(
    "curl.exe",
    "node.exe",
    "npm.cmd"
)

foreach ($Command in $Commands) {
    $Found = Get-Command $Command -ErrorAction SilentlyContinue

    if ($Found) {
        Write-Host "  [OK] $Command" -ForegroundColor Green
    }
    else {
        Write-Host "  [ERROR] $Command NOT FOUND" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ============================================================
# 3. Infrastructure mode / Kubernetes
# ============================================================

if ($InfraMode -notin @('local','k8s','auto')) {
    Write-Host "[ERROR] DEV_INFRA_MODE must be local, k8s, or auto." -ForegroundColor Red
    exit 1
}

$UseK8s = $false

if ($InfraMode -eq 'k8s') {
    $UseK8s = $true
}
elseif ($InfraMode -eq 'auto') {
    $KubeCommand = Get-Command kubectl -ErrorAction SilentlyContinue
    if ($KubeCommand) {
        Write-Host "[CHECK] Kubernetes is optional in auto mode..."
        & kubectl cluster-info *> $null
        if ($LASTEXITCODE -eq 0) {
            $UseK8s = $true
            Write-Host "[OK] Kubernetes cluster reachable; using Kubernetes services." -ForegroundColor Green
        }
        else {
            Write-Host "[INFO] Kubernetes is not reachable; using local PostgreSQL." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "[INFO] kubectl not installed; using local PostgreSQL." -ForegroundColor Yellow
    }
}

if ($InfraMode -eq 'k8s') {
    Write-Host "[CHECK] Checking Kubernetes..."
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Host "[ERROR] kubectl is required when DEV_INFRA_MODE=k8s." -ForegroundColor Red
        exit 1
    }
    & kubectl cluster-info
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Cannot connect to Kubernetes." -ForegroundColor Red
        Write-Host "Start Docker Desktop Kubernetes or use DEV_INFRA_MODE=local."
        exit 1
    }
    Write-Host "[OK] Kubernetes cluster reachable." -ForegroundColor Green
}

if ($UseK8s) {
# ============================================================
# 4. Namespace
# ============================================================

Write-Host "[CHECK] Checking cliniccare namespace..."

kubectl get namespace $K8sNamespace *> $null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Namespace '$K8sNamespace' does not exist." -ForegroundColor Red
    kubectl get namespaces
    exit 1
}

Write-Host "[OK] Namespace $K8sNamespace exists." -ForegroundColor Green
Write-Host ""

# ============================================================
# 5. Services
# ============================================================

Write-Host "[CHECK] Checking Kubernetes services..."

kubectl get svc $PostgresService -n $K8sNamespace *> $null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Service '$PostgresService' does not exist." -ForegroundColor Red
    kubectl get svc -n $K8sNamespace
    exit 1
}

Write-Host "[OK] $PostgresService service exists." -ForegroundColor Green
Write-Host ""

# ============================================================
# 6. Pods
# ============================================================

Write-Host "[INFO] Kubernetes pods:"
kubectl get pods -n $K8sNamespace -o wide
Write-Host ""

}

# ============================================================
# 7. Helper: Test TCP port
# ============================================================

function Test-Port {
    param(
        [int]$Port
    )

    try {
        $Connection = New-Object System.Net.Sockets.TcpClient

        $AsyncResult = $Connection.BeginConnect(
            "127.0.0.1",
            $Port,
            $null,
            $null
        )

        $Success = $AsyncResult.AsyncWaitHandle.WaitOne(1000)

        if ($Success -and $Connection.Connected) {
            $Connection.Close()
            return $true
        }

        $Connection.Close()
        return $false
    }
    catch {
        return $false
    }
}

# ============================================================
# 8. Start PostgreSQL port-forward
# ============================================================

$PostgresProcess = $null

Write-Host "[INFO] PostgreSQL localhost:$PostgresLocalPort"

if (Test-Port $PostgresLocalPort) {
    Write-Host "[OK] localhost:$PostgresLocalPort already open." -ForegroundColor Green
}
elseif (-not $UseK8s) {
    Write-Host "[ERROR] PostgreSQL is not listening on localhost:$PostgresLocalPort." -ForegroundColor Red
    Write-Host "Start PostgreSQL locally or set DEV_INFRA_MODE=k8s with a reachable cluster."
    exit 1
}
else {
    Write-Host "[START] Starting PostgreSQL port-forward..."

    $PostgresProcess = Start-Process `
        -FilePath "kubectl.exe" `
        -ArgumentList @(
            "port-forward",
            "-n",
            "$K8sNamespace",
            "svc/$PostgresService",
            "$PostgresLocalPort`:5432"
        ) `
        -RedirectStandardOutput "$logDir\postgres-port-forward.log" `
        -RedirectStandardError "$logDir\postgres-port-forward-error.log" `
        -PassThru `
        -WindowStyle Hidden

    Write-Host "   kubectl PID: $($PostgresProcess.Id)"

    $PostgresReady = $false

    for ($i = 1; $i -le 30; $i++) {

        Start-Sleep -Seconds 1

        if ($PostgresProcess.HasExited) {
            Write-Host "[ERROR] PostgreSQL port-forward exited." -ForegroundColor Red

            Write-Host ""
            Write-Host "----- PostgreSQL kubectl error -----" -ForegroundColor Yellow

            if (Test-Path "$logDir\postgres-port-forward-error.log") {
                Get-Content "$logDir\postgres-port-forward-error.log"
            }

            Write-Host "------------------------------------"
            exit 1
        }

        if (Test-Port $PostgresLocalPort) {
            Write-Host "[OK] PostgreSQL available on localhost:$PostgresLocalPort" -ForegroundColor Green
            $PostgresReady = $true
            break
        }
    }

    if (-not $PostgresReady) {
        Write-Host "[ERROR] PostgreSQL did not become available after 30 seconds." -ForegroundColor Red

        Write-Host ""
        Write-Host "----- PostgreSQL kubectl output -----" -ForegroundColor Yellow

        if (Test-Path "$logDir\postgres-port-forward.log") {
            Get-Content "$logDir\postgres-port-forward.log"
        }

        if (Test-Path "$logDir\postgres-port-forward-error.log") {
            Get-Content "$logDir\postgres-port-forward-error.log"
        }

        Write-Host "-------------------------------------"

        exit 1
    }
}

# ============================================================
# 10. Start API
# ============================================================

$ApiProcess = $null

Write-Host ""
Write-Host "[CHECK] Checking API..."

if (Test-Port $ApiPort) {
    Write-Host "[OK] API already listening on port $ApiPort." -ForegroundColor Green
}
else {

    Write-Host "[START] Starting NestJS API..."

    $env:NODE_ENV = if ($env:NODE_ENV) { $env:NODE_ENV } else { "development" }

    # Development uses tsx watch so a stale/missing dist/ folder can never
    # prevent the local API from starting.
    $ApiProcess = Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @(
            "run",
            "dev",
            "--workspace=@cliniccare/api"
        ) `
        -RedirectStandardOutput "$logDir\api.log" `
        -RedirectStandardError "$logDir\api-error.log" `
        -PassThru `
        -WindowStyle Hidden

    Write-Host "   API PID: $($ApiProcess.Id)"
    Write-Host "[WAIT] Waiting for API on localhost:$ApiPort..."

    $ApiReady = $false

    for ($i = 1; $i -le 30; $i++) {

        Start-Sleep -Seconds 1

        if (Test-Port $ApiPort) {
            try {
                $Response = Invoke-WebRequest `
                    -Uri "$ApiUrl$ApiHealthPath" `
                    -UseBasicParsing `
                    -TimeoutSec 3 `
                    -ErrorAction Stop

                if ($Response.StatusCode -eq 200) {
                    Write-Host "[OK] API healthcheck passed." -ForegroundColor Green
                    $ApiReady = $true
                    break
                }
            }
            catch {
                # API may be starting.
            }
        }

        if ($ApiProcess.HasExited) {
            Write-Host "[ERROR] API process exited." -ForegroundColor Red

            Write-Host ""
            Write-Host "================ API LOG ================"

            if (Test-Path "$logDir\api.log") {
                Get-Content "$logDir\api.log"
            }

            if (Test-Path "$logDir\api-error.log") {
                Get-Content "$logDir\api-error.log"
            }

            Write-Host "=========================================="

            exit 1
        }
    }

    if (-not $ApiReady) {
        Write-Host "[ERROR] API did not become healthy within 30 seconds." -ForegroundColor Red

        Write-Host ""
        Write-Host "================ API LOG ================"

        if (Test-Path "$logDir\api.log") {
            Get-Content "$logDir\api.log"
        }

        if (Test-Path "$logDir\api-error.log") {
            Get-Content "$logDir\api-error.log"
        }

        Write-Host "=========================================="

        exit 1
    }
}

# ============================================================
# 11. Start Web
# ============================================================

$WebProcess = $null

Write-Host ""
Write-Host "[CHECK] Checking Web..."

if (Test-Port $WebPort) {
    Write-Host "[OK] Web already listening on port $WebPort." -ForegroundColor Green
}
else {

    Write-Host "[START] Starting Next.js Web..."

    $env:PORT = "$WebPort"

    $WebProcess = Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @(
            "run",
            "dev",
            "--workspace=apps/web",
            "--",
            "--hostname",
            $WebHost,
            "--port",
            "$WebPort"
        ) `
        -RedirectStandardOutput "$logDir\web.log" `
        -RedirectStandardError "$logDir\web-error.log" `
        -PassThru `
        -WindowStyle Hidden

    Write-Host "   Web PID: $($WebProcess.Id)"
    Write-Host "[WAIT] Waiting for Web on localhost:$WebPort..."

    $WebReady = $false

    for ($i = 1; $i -le 45; $i++) {

        Start-Sleep -Seconds 1

        if (Test-Port $WebPort) {
            try {
                $Response = Invoke-WebRequest `
                    -Uri "http://localhost:$WebPort$WebHealthPath" `
                    -UseBasicParsing `
                    -TimeoutSec 3 `
                    -ErrorAction Stop

                if ($Response.StatusCode -eq 200) {
                    Write-Host "[OK] Web healthcheck passed." -ForegroundColor Green
                    $WebReady = $true
                    break
                }
            }
            catch {
                # Web is still starting.
            }
        }

        if ($WebProcess.HasExited) {
            Write-Host "[ERROR] Web process exited." -ForegroundColor Red

            Write-Host ""
            Write-Host "================ WEB LOG ================"

            if (Test-Path "$logDir\web.log") {
                Get-Content "$logDir\web.log"
            }

            if (Test-Path "$logDir\web-error.log") {
                Get-Content "$logDir\web-error.log"
            }

            Write-Host "=========================================="

            exit 1
        }
    }

    if (-not $WebReady) {
        Write-Host "[WARN] Web did not become healthy within 45 seconds." -ForegroundColor Yellow

        if (Test-Path "$logDir\web.log") {
            Get-Content "$logDir\web.log" -Tail 100
        }
    }
}

# ============================================================
# 12. Success
# ============================================================

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "   ClinicCare local environment is running    " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "PostgreSQL : localhost:$PostgresLocalPort"
Write-Host "API        : $ApiUrl"
Write-Host "Web        : http://localhost:$WebPort"
Write-Host "API health : $ApiUrl$ApiHealthPath"
Write-Host ""
Write-Host "Press Ctrl+C to stop the local environment."
Write-Host ""

# ============================================================
# 13. Keep script alive
# ============================================================

try {
    while ($true) {
        Start-Sleep -Seconds 2

        # Detect unexpectedly terminated processes
        if ($PostgresProcess -and $PostgresProcess.HasExited) {
            Write-Host "[WARN] PostgreSQL port-forward stopped." -ForegroundColor Yellow
        }

        if ($ApiProcess -and $ApiProcess.HasExited) {
            Write-Host "[WARN] API process stopped." -ForegroundColor Yellow
        }

        if ($WebProcess -and $WebProcess.HasExited) {
            Write-Host "[WARN] Web process stopped." -ForegroundColor Yellow
        }
    }
}
finally {

    Write-Host ""
    Write-Host "[STOP] Stopping ClinicCare..."

    if ($ApiProcess -and -not $ApiProcess.HasExited) {
        Stop-Process -Id $ApiProcess.Id -Force -ErrorAction SilentlyContinue
    }

    if ($WebProcess -and -not $WebProcess.HasExited) {
        Stop-Process -Id $WebProcess.Id -Force -ErrorAction SilentlyContinue
    }

    if ($PostgresProcess -and -not $PostgresProcess.HasExited) {
        Stop-Process -Id $PostgresProcess.Id -Force -ErrorAction SilentlyContinue
    }

    Write-Host "[OK] ClinicCare stopped." -ForegroundColor Green
Write-Host "Log file: $logFile" -ForegroundColor Cyan
Add-Content -Path $logFile -Value "ClinicCare startup completed at $(Get-Date)"
}
