param(
  [string]$QzTrayDir = '',
  [string]$KeysPath = '',
  [switch]$NoRestart,
  [switch]$NoPause
)

$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $scriptPath = $PSCommandPath
  if (-not $scriptPath) { $scriptPath = $MyInvocation.MyCommand.Path }
  if (-not $scriptPath) { throw 'No se pudo determinar la ruta del script.' }
  $shell = if (Get-Command pwsh.exe -ErrorAction SilentlyContinue) { (Get-Command pwsh.exe).Source } else { (Get-Command powershell.exe).Source }
  $argumentLine = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  if ($QzTrayDir) { $argumentLine += " -QzTrayDir `"$QzTrayDir`"" }
  if ($KeysPath) { $argumentLine += " -KeysPath `"$KeysPath`"" }
  if ($NoRestart) { $argumentLine += ' -NoRestart' }
  if ($NoPause) { $argumentLine += ' -NoPause' }
  Start-Process -FilePath $shell -Verb RunAs -ArgumentList $argumentLine
  exit
}

if (-not $KeysPath) {
  $defaultKeys = Join-Path (Split-Path -Parent $PSScriptRoot) 'src\services\printer\qzKeys.js'
  if (Test-Path -LiteralPath $defaultKeys) { $KeysPath = $defaultKeys }
}

$cert = ''
if ($KeysPath -and (Test-Path -LiteralPath $KeysPath)) {
  $content = [IO.File]::ReadAllText($KeysPath)
  $pattern = 'const\s+QZ_CERT\s*=\s*`\s*(?<cert>-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----)\s*`'
  $match = [regex]::Match($content, $pattern)
  if (-not $match.Success) { throw "No se encontro QZ_CERT en $KeysPath" }
  $cert = $match.Groups['cert'].Value.Trim()
} else {
  $fallback = Join-Path $PSScriptRoot 'override.crt'
  if (Test-Path -LiteralPath $fallback) {
    $cert = [IO.File]::ReadAllText($fallback).Trim()
  } else {
    throw 'No se encontro qzKeys.js ni override.crt junto al script.'
  }
}
$cert += [Environment]::NewLine

if (-not $QzTrayDir) {
  $candidates = @()
  if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'QZ Tray') }
  if (${env:ProgramFiles(x86)}) { $candidates += (Join-Path ${env:ProgramFiles(x86)} 'QZ Tray') }
  $QzTrayDir = $candidates | Where-Object {
    (Test-Path -LiteralPath (Join-Path $_ 'qz-tray.exe')) -or (Test-Path -LiteralPath (Join-Path $_ 'qz-tray.jar'))
  } | Select-Object -First 1
}
if (-not $QzTrayDir -or -not (Test-Path -LiteralPath $QzTrayDir)) {
  throw "No se encontro QZ Tray. Usa -QzTrayDir 'C:\Program Files\QZ Tray'"
}

$dest = Join-Path $QzTrayDir 'override.crt'
if (Test-Path -LiteralPath $dest) {
  $backup = "$dest.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Copy-Item -LiteralPath $dest -Destination $backup -Force
  Write-Host "Backup: $backup"
}

[IO.File]::WriteAllText($dest, $cert, [Text.Encoding]::ASCII)
Write-Host "Certificado instalado en: $dest"

if (-not $NoRestart) {
  $qzProcesses = Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -eq 'javaw.exe' -or $_.Name -eq 'java.exe') -and $_.CommandLine -like '*qz-tray.jar*'
  }
  foreach ($proc in $qzProcesses) {
    Stop-Process -Id $proc.ProcessId -Force
    Write-Host "QZ Tray detenido (PID $($proc.ProcessId))"
  }
  Start-Sleep -Seconds 2
  $exe = Join-Path $QzTrayDir 'qz-tray.exe'
  if (-not (Test-Path -LiteralPath $exe)) {
    throw "No se encontro qz-tray.exe en $QzTrayDir"
  }
  $explorer = Join-Path $env:WINDIR 'explorer.exe'
  if (Test-Path -LiteralPath $explorer) {
    Start-Process -FilePath $explorer -ArgumentList "`"$exe`""
  } else {
    Start-Process -FilePath $exe
  }
  $deadline = (Get-Date).AddSeconds(20)
  $port = $null
  $qzRunning = $null
  while ((Get-Date) -lt $deadline) {
    $qzRunning = Get-CimInstance Win32_Process | Where-Object {
      ($_.Name -eq 'javaw.exe' -or $_.Name -eq 'java.exe') -and $_.CommandLine -like '*qz-tray.jar*'
    }
    $port = Get-NetTCPConnection -LocalPort 8182 -State Listen -ErrorAction SilentlyContinue
    if ($qzRunning -and $port) { break }
    Start-Sleep -Seconds 1
  }
  if ($qzRunning -and $port) {
    Write-Host 'QZ Tray reiniciado y escuchando en el puerto 8182.'
  } else {
    Write-Warning 'QZ Tray no quedo escuchando en 8182. Abrelo manualmente desde el menu Inicio.'
  }
} else {
  Write-Host 'No se reinicio QZ Tray (-NoRestart).'
}

Write-Host ''
Write-Host 'Listo. Proba una impresion desde el frontend.'
if (-not $NoPause) { Read-Host 'Presiona Enter para cerrar' }
