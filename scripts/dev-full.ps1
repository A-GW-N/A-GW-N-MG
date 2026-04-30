$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$goScript = Join-Path $projectRoot "backend\go-proxy\start-go-proxy.ps1"
$goOut = Join-Path $projectRoot "backend\go-proxy\go-proxy.dev.log"
$goErr = Join-Path $projectRoot "backend\go-proxy\go-proxy.dev.err.log"

Remove-Item $goOut, $goErr -Force -ErrorAction SilentlyContinue

$goProcess = Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $goScript `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $goOut `
  -RedirectStandardError $goErr `
  -PassThru

Write-Host "Go proxy started with PID $($goProcess.Id)"
Write-Host "Logs:"
Write-Host "  $goOut"
Write-Host "  $goErr"

try {
  Set-Location $projectRoot
  pnpm dev
}
finally {
  if ($goProcess -and !$goProcess.HasExited) {
    Stop-Process -Id $goProcess.Id -Force -ErrorAction SilentlyContinue
  }
}
