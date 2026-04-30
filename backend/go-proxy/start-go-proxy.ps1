$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $projectRoot ".env"

if (Test-Path "C:\Program Files\Go\src\os") {
  $env:GOROOT = "C:\Program Files\Go"
}

$userGoPath = Join-Path $env:USERPROFILE "go"
New-Item -ItemType Directory -Force -Path $userGoPath | Out-Null
$env:GOPATH = $userGoPath
$env:GO111MODULE = "on"

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
      $name = $matches[1]
      $value = $matches[2].Trim()

      if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      if ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
  }

Set-Location $PSScriptRoot
go run .\cmd\server\main.go
