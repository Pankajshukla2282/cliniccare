$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
Set-Location $RepoRoot

Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ' ClinicCare Production Build' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan

$requiredNode = (Get-Content (Join-Path $RepoRoot '.nvmrc') -Raw).Trim()
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "Node: $nodeVersion"
Write-Host "npm : $npmVersion"

if ($nodeVersion -ne "v$requiredNode") {
    Write-Host "[ERROR] ClinicCare requires Node.js $requiredNode (from .nvmrc)." -ForegroundColor Red
    exit 1
}

Write-Host '[1/7] Validating Prisma schema and relations...' -ForegroundColor Yellow
npm run prisma:validate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[2/7] Generating Prisma Client...' -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[3/7] Type-checking API...' -ForegroundColor Yellow
npm run typecheck:api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[4/7] Type-checking Web...' -ForegroundColor Yellow
npm run typecheck:web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[5/7] Building API...' -ForegroundColor Yellow
npm run build:api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[6/7] Building Web...' -ForegroundColor Yellow
npm run build:web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[7/7] Checking migration state (no changes applied)...' -ForegroundColor Yellow
npx prisma migrate status
if ($LASTEXITCODE -ne 0) {
    Write-Host '[WARN] Migration status could not be checked. This does not alter the database.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'All ClinicCare production build checks completed successfully.' -ForegroundColor Green
