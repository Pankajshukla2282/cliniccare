$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
Set-Location $RepoRoot

Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ' ClinicCare Production Build' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan

$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "Node: $nodeVersion"
Write-Host "npm : $npmVersion"

if ($nodeVersion -ne 'v24.21.0') {
    Write-Host '[ERROR] ClinicCare requires Node.js v24.21.0.' -ForegroundColor Red
    exit 1
}

Write-Host '[1/6] Validating Prisma...' -ForegroundColor Yellow
npm run prisma:validate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[2/6] Generating Prisma Client...' -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[3/6] Type-checking API...' -ForegroundColor Yellow
npm run typecheck:api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[4/6] Type-checking Web...' -ForegroundColor Yellow
npm run typecheck:web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[5/6] Building API...' -ForegroundColor Yellow
npm run build:api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[6/6] Building Web...' -ForegroundColor Yellow
# API port is set to 3100; Web runs on 3000
$env:NEXT_PUBLIC_API_URL = 'http://localhost:3100'
npm run build:web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'All ClinicCare production builds completed successfully.' -ForegroundColor Green