param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$gameUrl = 'http://127.0.0.1:5173'
$logRoot = Join-Path $taskRoot 'artifacts\local-game'
function Test-GameReady {
    try {
        $health = Invoke-RestMethod "$gameUrl/api/health" -TimeoutSec 5
        $page = Invoke-WebRequest $gameUrl -UseBasicParsing -TimeoutSec 5
        return ($health.ok -eq $true -and $health.game -eq 'Mythoveya' -and $page.Content.Contains('Mythoveya'))
    } catch { return $false }
}
try {
    if (-not (Test-GameReady)) {
        $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
        $nodeMajor = [int]((& node -p 'process.versions.node.split(".")[0]') | Select-Object -Last 1)
        if ($nodeMajor -ne 24) { throw 'Mythoveya needs Node.js 24. Install it, then run this launcher again.' }
        if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'node_modules\vite'))) {
            throw 'Dependencies are missing. Open a terminal in the game folder and run npm ci, then try again.'
        }
        $listeners = Get-NetTCPConnection -State Listen -LocalPort 5173,2567 -ErrorAction SilentlyContinue
        if ($listeners) {
            throw 'Port 5173 or 2567 is already in use, but the game is not healthy. Close the old game terminal or check artifacts/local-game logs before retrying. No process was stopped.'
        }
        New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
        # Pin normal play ports and the save file, even when started from a test shell.
        $env:CLIENT_PORT = '5173'
        $env:SERVER_PORT = '2567'
        $env:DB_PATH = Join-Path $taskRoot 'data\mythoveya.sqlite'
        $process = Start-Process -FilePath $npmPath -ArgumentList @('run','dev') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'stdout.log') -RedirectStandardError (Join-Path $logRoot 'stderr.log') -PassThru
        $process.Id | Set-Content -LiteralPath (Join-Path $logRoot 'launcher.pid')
        $deadline = (Get-Date).AddSeconds(45)
        while (-not (Test-GameReady)) {
            $process.Refresh()
            if ($process.HasExited) { throw "Game startup exited. Read $logRoot/stdout.log and stderr.log for the error." }
            if ((Get-Date) -gt $deadline) { throw "The game is still starting or has not become healthy. Check $logRoot before retrying." }
            Start-Sleep -Milliseconds 500
        }
    }
    Write-Host "Mythoveya is ready: $gameUrl" -ForegroundColor Green
    Write-Host 'This is a local game link. Run this launcher again after restarting Windows.'
    if (-not $NoBrowser) { Start-Process $gameUrl }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
