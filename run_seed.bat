@echo off
setlocal
set "NODE_ENV=development"
set "APP_ENV=development"
if "%SEED_ADMIN_PASSWORD%"=="" set "SEED_ADMIN_PASSWORD=ChangeMe123!"
if "%SEED_SUPER_ADMIN_PASSWORD%"=="" set "SEED_SUPER_ADMIN_PASSWORD=SuperAdmin123!"
if "%SEED_DOCTOR_PASSWORD%"=="" set "SEED_DOCTOR_PASSWORD=Doctor123!"
if "%SEED_RECEPTION_PASSWORD%"=="" set "SEED_RECEPTION_PASSWORD=Reception123!"
if "%SEED_PATIENT_PASSWORD%"=="" set "SEED_PATIENT_PASSWORD=Patient123!"
cd /d "%~dp0"
echo Running idempotent ClinicCare seed for %APP_ENV%...
npm run db:seed
exit /b %ERRORLEVEL%
