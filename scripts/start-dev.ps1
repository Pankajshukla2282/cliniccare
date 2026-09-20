$ErrorActionPreference = "Stop"

# ============================================================
# ClinicCare Windows Development Startup
# ============================================================

$ScriptDir = Split-Path -Parent ($MyInvocation.MyCommand.Path)
$RepoRoot = Split-Path -Parent ($ScriptDir)

Set-Location -Path ($RepoRoot)

# ---------- Log folder & Transcript ----------
$logDir = Join-Path -Path ($RepoRoot) -ChildPath ("logs")
if (-not (Test-Path -Path ($logDir))) { New-Item -ItemType ("Directory") -Path ($logDir) | Out-Null }
$logFile = Join-Path -Path ($logDir) -ChildPath ("startup.log")

# Start logging session
Start-Transcript -Path ($logFile) -Append -ErrorAction ("SilentlyContinue") | Out-Null

Write-Host ("")
Write-Host ("==============================================") -ForegroundColor ("Cyan")
Write-Host ("     ClinicCare Windows Development Start     ") -ForegroundColor ("Cyan")
Write-Host ("==============================================") -ForegroundColor ("Cyan")
Write-Host ("")

Write-Host ("[INFO] Repo root: $RepoRoot")
Write-Host ("")

# Global process tracks for clean shutdown
$script:PostgresProcess =$null
$script:RedisProcess    =$null
$script:ApiProcess      =$null
$script:WebProcess      =$null

# Function to safely kill spawned background processes
function Stop-SpawnedProcesses {
    Write-Host ("")
    Write-Host ("[STOP] Cleaning up processes...") -ForegroundColor ("Yellow")

    @($script:ApiProcess,$script:WebProcess, $script:PostgresProcess,$script:RedisProcess) | ForEach-Object {
        if ($_ -and (-not ($_.HasExited))) {
            try {
                Stop-Process -Id ($_.Id) -Force -ErrorAction ("SilentlyContinue")
            } catch {}
        }
    }

    Write-Host ("[OK] All background services stopped.") -ForegroundColor ("Green")
}

# Register Ctrl+C / Exit event handlers
Register-EngineEvent -SourceIdentifier ("PowerShell.Exiting") -Action { Stop-SpawnedProcesses } | Out-Null

# ============================================================
# 1. Load .env
# ============================================================

$EnvFile = Join-Path -Path ($RepoRoot) -ChildPath (".env")

if (Test-Path -Path ($EnvFile)) {
    Write-Host ("[INFO] Loading .env...")

    Get-Content -Path ($EnvFile) | ForEach-Object {
        $line = ($_.Trim())

        if ($line -and (-not ($line.StartsWith("#"))) -and ($line.Contains("="))) {
            $parts = ($line.Split("=", 2))
            $name  = ($parts[0].Trim())
            $value = ($parts[1].Trim().Trim('"').Trim("'"))

            [Environment]::SetEnvironmentVariable($name,$value, "Process")
        }
    }
}
else {
    Write-Host ("[WARN] .env file not found") -ForegroundColor ("Yellow")
}

if (-not ($env:DATABASE_URL)) {
    Write-Host ("[ERROR] DATABASE_URL is not configured. Copy .env.example to .env and configure it.") -ForegroundColor ("Red")
    Stop-Transcript | Out-Null
    exit 1
}

Write-Host ("[OK] DATABASE_URL configured.") -ForegroundColor ("Green")
Write-Host ("")

# ============================================================
# 2. Check required commands
# ============================================================

Write-Host ("[CHECK] Checking required commands...")

$Commands = @("kubectl", "curl.exe", "node.exe", "npm.cmd")

foreach ($Command in $Commands) {
    if (Get-Command -Name ($Command) -ErrorAction ("SilentlyContinue")) {
        Write-Host ("  [OK] $Command") -ForegroundColor ("Green")
    }
    else {
        Write-Host ("  [ERROR] $Command NOT FOUND") -ForegroundColor ("Red")
        Stop-Transcript | Out-Null
        exit 1
    }
}

Write-Host ("")

# ============================================================
# 3. Kubernetes Connection
# ============================================================

Write-Host ("[CHECK] Checking Kubernetes...")

kubectl version --client *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host ("[ERROR] kubectl execution failed.") -ForegroundColor ("Red")
    Stop-Transcript | Out-Null
    exit 1
}

kubectl cluster-info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host ("[ERROR] Cannot connect to Kubernetes cluster.") -ForegroundColor ("Red")
    Write-Host ("Make sure Docker Desktop / Kubernetes cluster is running.") -ForegroundColor ("Yellow")
    Stop-Transcript | Out-Null
    exit 1
}

Write-Host ("[OK] Kubernetes cluster reachable.") -ForegroundColor ("Green")
Write-Host ("")

# ============================================================
# 4. Namespace
# ============================================================

Write-Host ("[CHECK] Checking cliniccare namespace...")

kubectl get namespace cliniccare *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host ("[ERROR] Namespace 'cliniccare' does not exist.") -ForegroundColor ("Red")
    kubectl get namespaces
    Stop-Transcript | Out-Null
    exit 1
}

Write-Host ("[OK] Namespace cliniccare exists.") -ForegroundColor ("Green")
Write-Host ("")

# ============================================================
# 5. Services Check
# ============================================================

Write-Host ("[CHECK] Checking Kubernetes services...")

foreach ($svc in @("postgres", "redis")) {
    kubectl get svc $svc -n cliniccare *>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host ("[ERROR] Service '$svc' does not exist in namespace cliniccare.") -ForegroundColor ("Red")
        kubectl get svc -n cliniccare
        Stop-Transcript | Out-Null
        exit 1
    }
    Write-Host ("  [OK] $svc service exists.") -ForegroundColor ("Green")
}

Write-Host ("")

# ============================================================
# 6. Helper: Test TCP Port
# ============================================================

function Test-Port {
    param([int]$Port)

    try {
        $Connection = New-Object System.Net.Sockets.TcpClient
        $AsyncResult = $Connection.BeginConnect("127.0.0.1", $Port, $null,$null)
        $Success =$AsyncResult.AsyncWaitHandle.WaitOne(1000)

        if ($Success -and ($Connection.Connected)) {$Connection.Close()
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
# 7. PostgreSQL Port-Forward (5432)
# ============================================================

Write-Host ("[INFO] PostgreSQL (localhost:5432)")

if (Test-Port -Port (5432)) {
    Write-Host ("[OK] localhost:5432 already open.") -ForegroundColor ("Green")
}
else {
    Write-Host ("[START] Starting PostgreSQL port-forward...")

    $script:PostgresProcess = Start-Process `
        -FilePath ("kubectl.exe") `
        -ArgumentList @("port-forward", "-n", "cliniccare", "svc/postgres", "5432:5432") `
        -RedirectStandardOutput ("$logDir\postgres-port-forward.log") `
        -RedirectStandardError ("$logDir\postgres-port-forward-error.log") `
        -PassThru `
        -WindowStyle ("Hidden")

    Write-Host ("   kubectl PID: $($script:PostgresProcess.Id)")

    $PostgresReady =$false
    for ($i = 1; $i -le 30; $i++) {
        Start-Sleep -Seconds (1)

        if ($script:PostgresProcess.HasExited) {
            Write-Host ("[ERROR] PostgreSQL port-forward process exited unexpectedly.") -ForegroundColor ("Red")
            if (Test-Path -Path ("$logDir\postgres-port-forward-error.log")) {
                Get-Content -Path ("$logDir\postgres-port-forward-error.log")
            }
            Stop-SpawnedProcesses
            Stop-Transcript | Out-Null
            exit 1
        }

        if (Test-Port -Port (5432)) {
            Write-Host ("[OK] PostgreSQL available on localhost:5432") -ForegroundColor ("Green")
            $PostgresReady =$true
            break
        }
    }

    if (-not ($PostgresReady)) {
        Write-Host ("[ERROR] PostgreSQL did not become available within 30 seconds.") -ForegroundColor ("Red")
        Stop-SpawnedProcesses
        Stop-Transcript | Out-Null
        exit 1
    }
}

# ============================================================
# 8. Redis Port-Forward (6379)
# ============================================================

Write-Host ("")
Write-Host ("[INFO] Redis (localhost:6379)")

if (Test-Port -Port (6379)) {
    Write-Host ("[OK] localhost:6379 already open.") -ForegroundColor ("Green")
}
else {
    Write-Host ("[START] Starting Redis port-forward...")

    $script:RedisProcess = Start-Process `
        -FilePath ("kubectl.exe") `
        -ArgumentList @("port-forward", "-n", "cliniccare", "svc/redis", "6379:6379") `
        -RedirectStandardOutput ("$logDir\redis-port-forward.log") `
        -RedirectStandardError ("$logDir\redis-port-forward-error.log") `
        -PassThru `
        -WindowStyle ("Hidden")

    Write-Host ("   kubectl PID: $($script:RedisProcess.Id)")

    $RedisReady =$false
    for ($i = 1; $i -le 30; $i++) {
        Start-Sleep -Seconds (1)

        if ($script:RedisProcess.HasExited) {
            Write-Host ("[ERROR] Redis port-forward process exited unexpectedly.") -ForegroundColor ("Red")
            if (Test-Path -Path ("$logDir\redis-port-forward-error.log")) {
                Get-Content -Path ("$logDir\redis-port-forward-error.log")
            }
            Stop-SpawnedProcesses
            Stop-Transcript | Out-Null
            exit 1
        }

        if (Test-Port -Port (6379)) {
            Write-Host ("[OK] Redis available on localhost:6379") -ForegroundColor ("Green")
            $RedisReady =$true
            break
        }
    }

    if (-not ($RedisReady)) {
        Write-Host ("[ERROR] Redis did not become available within 30 seconds.") -ForegroundColor ("Red")
        Stop-SpawnedProcesses
        Stop-Transcript | Out-Null
        exit 1
    }
}

# ============================================================
# 9. Start API App (Port 3100)
# ============================================================

Write-Host ("")
Write-Host ("[CHECK] Checking NestJS API (Port 3100)...")

$ApiPort = 3100

if (Test-Port -Port ($ApiPort)) {
    Write-Host ("[OK] API already listening on port $ApiPort.") -ForegroundColor ("Green")
}
else {
    Write-Host ("[START] Starting NestJS API...")

    $DistMain = Join-Path -Path ($RepoRoot) -ChildPath ("apps\api\dist\main.js")

    if (-not (Test-Path -Path ($DistMain))) {
        Write-Host ("[ERROR] API build file missing: $DistMain") -ForegroundColor ("Red")
        Write-Host ("Run 'npm run build' first to build the workspace.") -ForegroundColor ("Yellow")
        Stop-SpawnedProcesses
        Stop-Transcript | Out-Null
        exit 1
    }

    $env:NODE_ENV = "production"

    $script:ApiProcess = Start-Process `
        -FilePath ("node.exe") `
        -ArgumentList @($DistMain) `
        -RedirectStandardOutput ("$logDir\api.log") `
        -RedirectStandardError ("$logDir\api-error.log") `
        -PassThru `
        -WindowStyle ("Hidden")

    Write-Host ("   API PID: $($script:ApiProcess.Id)")
    Write-Host ("[WAIT] Waiting for API health check on localhost:$ApiPort...")

    $ApiReady =$false
    for ($i = 1; $i -le 30; $i++) {
        Start-Sleep -Seconds (1)

        if (Test-Port -Port ($ApiPort)) {
            try {
                $Response = Invoke-WebRequest -Uri ("http://localhost:$ApiPort/healthz") -UseBasicParsing -TimeoutSec (3) -ErrorAction ("Stop")
                if ($Response.StatusCode -eq 200) {
                    Write-Host ("[OK] API health check passed.") -ForegroundColor ("Green")
                    $ApiReady =$true
                    break
                }
            }
            catch {}
        }

        if ($script:ApiProcess.HasExited) {
            Write-Host ("[ERROR] API process exited unexpectedly.") -ForegroundColor ("Red")
            if (Test-Path -Path ("$logDir\api-error.log")) { Get-Content -Path ("$logDir\api-error.log") }
            Stop-SpawnedProcesses
            Stop-Transcript | Out-Null
            exit 1
        }
    }

    if (-not ($ApiReady)) {
        Write-Host ("[ERROR] API did not become healthy within 30 seconds.") -ForegroundColor ("Red")
        Stop-SpawnedProcesses
        Stop-Transcript | Out-Null
        exit 1
    }
}

# ============================================================
# 10. Start Web App (Port 3000)
# ============================================================

Write-Host ("")
Write-Host ("[CHECK] Checking Next.js Web (Port 3000)...")

$WebPort = 3000

if (Test-Port -Port ($WebPort)) {
    Write-Host ("[OK] Web already listening on port $WebPort.") -ForegroundColor ("Green")
}
else {
    Write-Host ("[START] Starting Next.js Web on port $WebPort...")

    $env:PORT =$WebPort

    $script:WebProcess = Start-Process `
        -FilePath ("npm.cmd") `
        -ArgumentList @("run", "dev", "--workspace=apps/web") `
        -RedirectStandardOutput ("$logDir\web.log") `
        -RedirectStandardError ("$logDir\web-error.log") `
        -PassThru `
        -WindowStyle ("Hidden")

    Write-Host ("   Web PID: $($script:WebProcess.Id)")
    Write-Host ("[WAIT] Waiting for Web on localhost:$WebPort...")

    $WebReady =$false
    for ($i = 1; $i -le 45; $i++) {
        Start-Sleep -Seconds (1)

        if (Test-Port -Port ($WebPort)) {
            Write-Host ("[OK] Web application is listening on port $WebPort.") -ForegroundColor ("Green")
            $WebReady =$true
            break
        }

        if ($script:WebProcess.HasExited) {
            Write-Host ("[ERROR] Web process exited unexpectedly.") -ForegroundColor ("Red")
            if (Test-Path -Path ("$logDir\web-error.log")) { Get-Content -Path ("$logDir\web-error.log") }
            Stop-SpawnedProcesses
            Stop-Transcript | Out-Null
            exit 1
        }
    }

    if (-not ($WebReady)) {
        Write-Host ("[WARN] Web app did not respond within 45 seconds. Check logs: $logDir\web.log") -ForegroundColor ("Yellow")
    }
}

# ============================================================
# 11. Success Summary
# ============================================================

Write-Host ("")
Write-Host ("==============================================") -ForegroundColor ("Green")
Write-Host ("   ClinicCare local environment is running    ") -ForegroundColor ("Green")
Write-Host ("==============================================") -ForegroundColor ("Green")
Write-Host ("")
Write-Host ("PostgreSQL : localhost:5432")
Write-Host ("Redis      : localhost:6379")
Write-Host ("API        : http://localhost:3100")
Write-Host ("Web        : http://localhost:3000")
Write-Host ("Swagger    : http://localhost:3100/docs")
Write-Host ("")
Write-Host ("Press Ctrl+C to stop the local environment.")
Write-Host ("")

# ============================================================
# 12. Keep Alive Loop
# ============================================================

try {
    while ($true) {
        Start-Sleep -Seconds (2)

        if ($script:PostgresProcess -and ($script:PostgresProcess.HasExited)) {
            Write-Host ("[WARN] PostgreSQL port-forward stopped.") -ForegroundColor ("Yellow")
        }
        if ($script:RedisProcess -and ($script:RedisProcess.HasExited)) {
            Write-Host ("[WARN] Redis port-forward stopped.") -ForegroundColor ("Yellow")
        }
        if ($script:ApiProcess -and ($script:ApiProcess.HasExited)) {
            Write-Host ("[WARN] API process stopped.") -ForegroundColor ("Yellow")
        }
        if ($script:WebProcess -and ($script:WebProcess.HasExited)) {
            Write-Host ("[WARN] Web process stopped.") -ForegroundColor ("Yellow")
        }
    }
}
finally {
    Stop-SpawnedProcesses
    Stop-Transcript | Out-Null
}