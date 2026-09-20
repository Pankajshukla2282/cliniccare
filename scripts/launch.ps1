param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet("start", "stop", "build")]
    [string]$Action
)

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

$ScriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path

switch ($Action) {
    "start" {
        $TargetScript = Join-Path $ScriptsDir "start-dev.ps1"
    }

    "stop" {
        $TargetScript = Join-Path $ScriptsDir "stop-dev.ps1"
    }

    "build" {
        $TargetScript = Join-Path $ScriptsDir "build-all.ps1"
    }
}

# ------------------------------------------------------------
# Verify target script
# ------------------------------------------------------------

if (-not (Test-Path $TargetScript -PathType Leaf)) {
    Write-Host ""
    Write-Host "[ERROR] Script not found:" -ForegroundColor Red
    Write-Host "   $TargetScript"
    Write-Host ""
    exit 1
}

$TargetScript = (Resolve-Path $TargetScript).Path

# ------------------------------------------------------------
# Launch with ExecutionPolicy Bypass
# ------------------------------------------------------------

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " ClinicCare $Action launcher" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Script: $TargetScript"
Write-Host "[INFO] ExecutionPolicy: Bypass"
Write-Host ""

& powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File $TargetScript

$ExitCode = $LASTEXITCODE

Write-Host ""

if ($ExitCode -eq 0) {
    Write-Host "[OK] $Action completed successfully." -ForegroundColor Green
}
else {
    Write-Host "[ERROR] $Action failed with exit code $ExitCode." -ForegroundColor Red
}

exit $ExitCode
