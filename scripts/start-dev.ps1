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
$logFile = Join-Path $logDir "cliniccare.log"

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
    $env:DATABASE_URL =
        "postgresql://clinic:JWbD4wxpHI7tmGMwtnhb6hwt@localhost:5432/cliniccare"
}

Write-Host "[OK] DATABASE_URL configured."
Write-Host ""

# ============================================================
# 2. Check required commands
# ============================================================

Write-Host "[CHECK] Checking required commands..."

$Commands = @(
    "kubectl",
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
# 3. Kubernetes
# ============================================================

Write-Host "[CHECK] Checking Kubernetes..."

kubectl version --client

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] kubectl is not working." -ForegroundColor Red
    exit 1
}

kubectl cluster-info

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Cannot connect to Kubernetes." -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure Docker Desktop Kubernetes is running."
    exit 1
}

Write-Host "[OK] Kubernetes cluster reachable." -ForegroundColor Green
Write-Host ""

# ============================================================
# 4. Namespace
# ============================================================

Write-Host "[CHECK] Checking cliniccare namespace..."

kubectl get namespace cliniccare *> $null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Namespace 'cliniccare' does not exist." -ForegroundColor Red
    kubectl get namespaces
    exit 1
}

Write-Host "[OK] Namespace cliniccare exists." -ForegroundColor Green
Write-Host ""

# ============================================================
# 5. Services
# ============================================================

Write-Host "[CHECK] Checking Kubernetes services..."

kubectl get svc postgres -n cliniccare *> $null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Service 'postgres' does not exist." -ForegroundColor Red
    kubectl get svc -n cliniccare
    exit 1
}

kubectl get svc redis -n cliniccare *> $null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Service 'redis' does not exist." -ForegroundColor Red
    kubectl get svc -n cliniccare
    exit 1
}

Write-Host "[OK] postgres service exists." -ForegroundColor Green
Write-Host "[OK] redis service exists." -ForegroundColor Green
Write-Host ""

# ============================================================
# 6. Pods
# ============================================================

Write-Host "[INFO] Kubernetes pods:"
kubectl get pods -n cliniccare -o wide
Write-Host ""

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

Write-Host "[INFO] PostgreSQL localhost:5432"

if (Test-Port 5432) {
    Write-Host "[OK] localhost:5432 already open." -ForegroundColor Green
}
else {
    Write-Host "[START] Starting PostgreSQL port-forward..."

    $PostgresProcess = Start-Process `
        -FilePath "kubectl.exe" `
        -ArgumentList @(
            "port-forward",
            "-n",
            "cliniccare",
            "svc/postgres",
            "5432:5432"
        ) `
        -RedirectStandardOutput "$RepoRoot\postgres-port-forward.log" `
        -RedirectStandardError "$RepoRoot\postgres-port-forward-error.log" `
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

            if (Test-Path "$RepoRoot\postgres-port-forward-error.log") {
                Get-Content "$RepoRoot\postgres-port-forward-error.log"
            }

            Write-Host "------------------------------------"
            exit 1
        }

        if (Test-Port 5432) {
            Write-Host "[OK] PostgreSQL available on localhost:5432" -ForegroundColor Green
            $PostgresReady = $true
            break
        }
    }

    if (-not $PostgresReady) {
        Write-Host "[ERROR] PostgreSQL did not become available after 30 seconds." -ForegroundColor Red

        Write-Host ""
        Write-Host "----- PostgreSQL kubectl output -----" -ForegroundColor Yellow

        if (Test-Path "$RepoRoot\postgres-port-forward.log") {
            Get-Content "$RepoRoot\postgres-port-forward.log"
        }

        if (Test-Path "$RepoRoot\postgres-port-forward-error.log") {
            Get-Content "$RepoRoot\postgres-port-forward-error.log"
        }

        Write-Host "-------------------------------------"

        exit 1
    }
}

# ============================================================
# 9. Start Redis port-forward
# ============================================================

$RedisProcess = $null

Write-Host ""
Write-Host "[INFO] Redis localhost:6379"

if (Test-Port 6379) {
    Write-Host "[OK] localhost:6379 already open." -ForegroundColor Green
}
else {
    Write-Host "[START] Starting Redis port-forward..."

    $RedisProcess = Start-Process `
        -FilePath "kubectl.exe" `
        -ArgumentList @(
            "port-forward",
            "-n",
            "cliniccare",
            "svc/redis",
            "6379:6379"
        ) `
        -RedirectStandardOutput "$RepoRoot\redis-port-forward.log" `
        -RedirectStandardError "$RepoRoot\redis-port-forward-error.log" `
        -PassThru `
        -WindowStyle Hidden

    Write-Host "   kubectl PID: $($RedisProcess.Id)"

    $RedisReady = $false

    for ($i = 1; $i -le 30; $i++) {

        Start-Sleep -Seconds 1

        if ($RedisProcess.HasExited) {
            Write-Host "[ERROR] Redis port-forward exited." -ForegroundColor Red

            Write-Host ""
            Write-Host "----- Redis kubectl error -----" -ForegroundColor Yellow

            if (Test-Path "$RepoRoot\redis-port-forward-error.log") {
                Get-Content "$RepoRoot\redis-port-forward-error.log"
            }

            Write-Host "-------------------------------"
            exit 1
        }

        if (Test-Port 6379) {
            Write-Host "[OK] Redis available on localhost:6379" -ForegroundColor Green
            $RedisReady = $true
            break
        }
    }

    if (-not $RedisReady) {
        Write-Host "[ERROR] Redis did not become available after 30 seconds." -ForegroundColor Red
        exit 1
    }
}

# ============================================================
# 10. Start API
# ============================================================

$ApiProcess = $null

Write-Host ""
Write-Host "[CHECK] Checking API..."

if (Test-Port 3000) {
    Write-Host "[OK] API already listening on port 3000." -ForegroundColor Green
}
else {

    Write-Host "[START] Starting NestJS API..."

    $DistMain = Join-Path $RepoRoot "apps\api\dist\main.js"

    if (-not (Test-Path $DistMain)) {
        Write-Host "[ERROR] $DistMain does not exist." -ForegroundColor Red
        Write-Host ""
        Write-Host "Build the API first:"
        Write-Host "  npm run build"
        exit 1
    }

    $env:NODE_ENV = "production"

    $ApiProcess = Start-Process `
        -FilePath "node.exe" `
        -ArgumentList @(
            $DistMain
        ) `
        -RedirectStandardOutput "$RepoRoot\api.log" `
        -RedirectStandardError "$RepoRoot\api-error.log" `
        -PassThru `
        -WindowStyle Hidden

    Write-Host "   API PID: $($ApiProcess.Id)"
    Write-Host "[WAIT] Waiting for API on localhost:3000..."

    $ApiReady = $false

    for ($i = 1; $i -le 30; $i++) {

        Start-Sleep -Seconds 1

        if (Test-Port 3000) {
            try {
                $Response = Invoke-WebRequest `
                    -Uri "http://localhost:3000/healthz" `
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

            if (Test-Path "$RepoRoot\api.log") {
                Get-Content "$RepoRoot\api.log"
            }

            if (Test-Path "$RepoRoot\api-error.log") {
                Get-Content "$RepoRoot\api-error.log"
            }

            Write-Host "=========================================="

            exit 1
        }
    }

    if (-not $ApiReady) {
        Write-Host "[ERROR] API did not become healthy within 30 seconds." -ForegroundColor Red

        Write-Host ""
        Write-Host "================ API LOG ================"

        if (Test-Path "$RepoRoot\api.log") {
            Get-Content "$RepoRoot\api.log"
        }

        if (Test-Path "$RepoRoot\api-error.log") {
            Get-Content "$RepoRoot\api-error.log"
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

if (Test-Port 3100) {
    Write-Host "[OK] Web already listening on port 3100." -ForegroundColor Green
}
else {

    Write-Host "[START] Starting Next.js Web..."

    $env:PORT = "3100"

    $WebProcess = Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @(
            "run",
            "dev",
            "--workspace=apps/web"
        ) `
        -RedirectStandardOutput "$RepoRoot\web.log" `
        -RedirectStandardError "$RepoRoot\web-error.log" `
        -PassThru `
        -WindowStyle Hidden

    Write-Host "   Web PID: $($WebProcess.Id)"
    Write-Host "[WAIT] Waiting for Web on localhost:3100..."

    $WebReady = $false

    for ($i = 1; $i -le 45; $i++) {

        Start-Sleep -Seconds 1

        if (Test-Port 3100) {
            try {
                $Response = Invoke-WebRequest `
                    -Uri "http://localhost:3100/healthz" `
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

            if (Test-Path "$RepoRoot\web.log") {
                Get-Content "$RepoRoot\web.log"
            }

            if (Test-Path "$RepoRoot\web-error.log") {
                Get-Content "$RepoRoot\web-error.log"
            }

            Write-Host "=========================================="

            exit 1
        }
    }

    if (-not $WebReady) {
        Write-Host "[WARN] Web did not become healthy within 45 seconds." -ForegroundColor Yellow

        if (Test-Path "$RepoRoot\web.log") {
            Get-Content "$RepoRoot\web.log" -Tail 100
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
Write-Host "PostgreSQL : localhost:5432"
Write-Host "Redis      : localhost:6379"
Write-Host "API        : http://localhost:3000"
Write-Host "Web        : http://localhost:3100"
Write-Host "Swagger    : http://localhost:3000/docs"
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

        if ($RedisProcess -and $RedisProcess.HasExited) {
            Write-Host "[WARN] Redis port-forward stopped." -ForegroundColor Yellow
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

    if ($RedisProcess -and -not $RedisProcess.HasExited) {
        Stop-Process -Id $RedisProcess.Id -Force -ErrorAction SilentlyContinue
    }

    Write-Host "[OK] ClinicCare stopped." -ForegroundColor Green
Write-Host "Log file: $logFile" -ForegroundColor Cyan
Add-Content -Path $logFile -Value "ClinicCare startup completed at $(Get-Date)"
}
