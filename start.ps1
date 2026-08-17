cd D:\kemraa
Write-Host "=== KEMRAA Startup ===" -ForegroundColor Cyan

# 1) Docker containers
Write-Host "`n[1/3] Docker containers..." -ForegroundColor Yellow
$pgName = docker ps -a --format "{{.Names}} {{.Ports}}" 2>$null | Select-String "15432" | ForEach-Object { ($_ -split " ")[0] } | Select-Object -First 1
if ($pgName) { docker start $pgName | Out-Null; Write-Host "  [OK] PostgreSQL ($pgName)" -ForegroundColor Green }

docker start kemraa-redis 2>$null | Out-Null
Write-Host "  [OK] Redis" -ForegroundColor Green

docker start kemraa-api-test 2>$null | Out-Null
Write-Host "  [OK] API" -ForegroundColor Green

# Wait for API
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        if ((Invoke-RestMethod -Uri http://localhost:4001/api/v1/health/ready -TimeoutSec 2).status -eq "ok") {
            $ready = $true; break
        }
    } catch {}
    Start-Sleep 1
}
if ($ready) { Write-Host "  [OK] API ready on :4001" -ForegroundColor Green }
else { Write-Host "  [ERR] API not ready - check: docker logs kemraa-api-test" -ForegroundColor Red }

# 2) Admin dashboard
Write-Host "`n[2/3] Admin dashboard..." -ForegroundColor Yellow
$running = $false
try {
    Invoke-WebRequest -Uri http://localhost:3002 -UseBasicParsing -TimeoutSec 2 | Out-Null
    $running = $true
} catch {}

if (-not $running) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\kemraa\apps\admin; pnpm dev -- -p 3002"
    Start-Sleep 10
}
Write-Host "  [OK] Admin on :3002" -ForegroundColor Green

# 3) Links
Write-Host "`n[3/3] Done!" -ForegroundColor Green
Write-Host "  Login:    http://localhost:3002/login" -ForegroundColor Cyan
Write-Host "  Email:    hoodazoz2030@gmail.com" -ForegroundColor Yellow
Write-Host "  Username: owner" -ForegroundColor Yellow
Write-Host "  Password: Kemraa@2026!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host