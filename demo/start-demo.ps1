<#
.SYNOPSIS
    Builds MedBook (frontend + ../MedBook.Api) and shares it through a public https link.

.DESCRIPTION
    Starts the API (Production mode, its own demo database), the Angular server, Caddy
    (routes /api to the API, everything else to Angular) and a Cloudflare quick tunnel.
    The public https://....trycloudflare.com link is printed by cloudflared below.
    Press Ctrl+C to stop everything.

    Requires: winget install CaddyServer.Caddy ; winget install Cloudflare.cloudflared
    (or, for -Tunnel tailscale: winget install Tailscale.Tailscale, logged in, Funnel enabled)

.PARAMETER Tunnel
    cloudflare (default): a new random https://....trycloudflare.com link on every start.
    tailscale: the same https://<machine>.<tailnet>.ts.net link every time (Tailscale Funnel).

.PARAMETER SkipBuild
    Reuse the last build (faster restarts).

.PARAMETER ResetData
    Delete the demo database so the API re-seeds the Sunrise Family Clinic demo data.

.PARAMETER LocalOnly
    Don't open a tunnel - just serve on http://localhost:8080 (and your LAN IP).
#>
param(
    [ValidateSet('cloudflare', 'tailscale')]
    [string]$Tunnel = 'cloudflare',
    [switch]$SkipBuild,
    [switch]$ResetData,
    [switch]$LocalOnly
)

$ErrorActionPreference = 'Stop'

$frontendRoot = Split-Path $PSScriptRoot -Parent
$apiProject   = Join-Path $frontendRoot '..\MedBook.Api\MedBook.Api\MedBook.Api.csproj'
$outDir       = Join-Path $PSScriptRoot '.out'
$apiOut       = Join-Path $outDir 'api'
$dataDir      = Join-Path $outDir 'data'
$logDir       = Join-Path $outDir 'logs'

$tunnelTool = if ($Tunnel -eq 'tailscale') { 'tailscale' } else { 'cloudflared' }
foreach ($tool in @('node', 'dotnet', 'caddy') + @(if (-not $LocalOnly) { $tunnelTool })) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "'$tool' is not installed or not on PATH. See the requirements at the top of this script (open a new terminal after installing)."
    }
}

New-Item -ItemType Directory -Force $outDir, $dataDir, $logDir | Out-Null

if ($ResetData) {
    Get-ChildItem $dataDir -Filter 'medbook-demo.db*' | Remove-Item -Force
    Write-Host 'Demo database deleted - it will be re-seeded on startup.' -ForegroundColor Yellow
}

# --- Build ---

if (-not $SkipBuild) {
    Write-Host 'Building frontend...' -ForegroundColor Cyan
    Push-Location $frontendRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
    }
    finally { Pop-Location }

    Write-Host 'Publishing API...' -ForegroundColor Cyan
    dotnet publish $apiProject -c Release -o $apiOut --nologo
    if ($LASTEXITCODE -ne 0) { throw 'API publish failed.' }
}

# --- Secrets & config (kept in demo/.out, which is git-ignored) ---

# A stable JWT key, so demo sessions survive restarts of this script.
$jwtKeyFile = Join-Path $outDir 'jwt.key'
if (-not (Test-Path $jwtKeyFile)) {
    $bytes = [byte[]]::new(64)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    [Convert]::ToBase64String($bytes) | Set-Content $jwtKeyFile -NoNewline
}

$env:ASPNETCORE_ENVIRONMENT = 'Production'
$env:ASPNETCORE_URLS = 'http://localhost:5262'
$env:Jwt__Key = Get-Content $jwtKeyFile -Raw
$env:ConnectionStrings__MedBook = "Data Source=$(Join-Path $dataDir 'medbook-demo.db')"
# Behind the proxy every visitor shares one IP, so allow more logins per minute than the default 5.
$env:RateLimiting__LoginAttemptsPerMinute = '60'
# Optional: set these before running to get a super-admin login for the demo.
# $env:PlatformAdmin__Email = 'owner@medbook.demo'; $env:PlatformAdmin__Password = '...'
$env:PORT = '4000'

# --- Run ---

$processes = @()
try {
    Write-Host 'Starting API on :5262, Angular on :4000, Caddy on :8080...' -ForegroundColor Cyan

    $processes += Start-Process dotnet -ArgumentList 'MedBook.Api.dll' -WorkingDirectory $apiOut -NoNewWindow -PassThru `
        -RedirectStandardOutput (Join-Path $logDir 'api.log') -RedirectStandardError (Join-Path $logDir 'api.err.log')
    $processes += Start-Process node -ArgumentList '"dist/MedBook/server/server.mjs"' -WorkingDirectory $frontendRoot -NoNewWindow -PassThru `
        -RedirectStandardOutput (Join-Path $logDir 'web.log') -RedirectStandardError (Join-Path $logDir 'web.err.log')
    $processes += Start-Process caddy -ArgumentList 'run', '--config', "`"$(Join-Path $PSScriptRoot 'Caddyfile')`"", '--adapter', 'caddyfile' -NoNewWindow -PassThru `
        -RedirectStandardOutput (Join-Path $logDir 'caddy.log') -RedirectStandardError (Join-Path $logDir 'caddy.err.log')

    Start-Sleep -Seconds 3
    $dead = $processes | Where-Object HasExited
    if ($dead) { throw "A process exited on startup - check the logs in $logDir" }

    $lanIp = (Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
    Write-Host ''
    Write-Host 'MedBook demo is running:' -ForegroundColor Green
    Write-Host '  This PC:        http://localhost:8080'
    if ($lanIp) { Write-Host "  Same Wi-Fi:     http://${lanIp}:8080  (login needs https - use the tunnel link on other devices)" }
    Write-Host '  Demo logins:    dr.carter@medbook.demo / Doctor123!  (clinic admin)'
    Write-Host '                  dr.lee@medbook.demo / Doctor123!'
    Write-Host '                  grace.novak@medbook.demo / Employee123!'
    Write-Host "  Logs:           $logDir"
    Write-Host ''

    if ($LocalOnly) {
        Write-Host 'Press Ctrl+C to stop.' -ForegroundColor Yellow
        Wait-Process -Id $processes.Id
    }
    elseif ($Tunnel -eq 'tailscale') {
        $dnsName = (tailscale status --json | ConvertFrom-Json).Self.DNSName.TrimEnd('.')
        Write-Host "Public link (fixed):  https://$dnsName  - Ctrl+C to stop." -ForegroundColor Yellow
        # Runs in the foreground; the Funnel is removed again when this stops.
        tailscale funnel 8080
    }
    else {
        Write-Host 'Opening public tunnel - look for the https://....trycloudflare.com link below. Ctrl+C to stop.' -ForegroundColor Yellow
        cloudflared tunnel --no-autoupdate --url http://localhost:8080
    }
}
finally {
    Write-Host 'Stopping demo...' -ForegroundColor Cyan
    $processes | Where-Object { -not $_.HasExited } | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
}
