$ErrorActionPreference = 'Stop'
$entregaRoot = $PSScriptRoot
$repoRoot = Split-Path $entregaRoot -Parent
$pythonExe = Join-Path $entregaRoot '.venv\Scripts\python.exe'
$runtimeRoot = Join-Path $entregaRoot 'var'
$tempRoot = Join-Path $runtimeRoot 'tmp'
$logRoot = Join-Path $runtimeRoot 'logs'
New-Item -ItemType Directory -Force $tempRoot,$logRoot | Out-Null
$env:TEMP = $tempRoot
$env:TMP = $tempRoot
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:PYTHONUTF8 = '1'
$env:HF_HOME = Join-Path $runtimeRoot 'models'
$env:HF_HUB_CACHE = Join-Path $env:HF_HOME 'hub'
$env:HF_HUB_DISABLE_XET = '1'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:LLM_PROVIDER = 'demo'
if (-not (Test-Path -LiteralPath $pythonExe)) { throw 'Falta el entorno Python. Consulte entrega3/README.md.' }
if (-not (Test-Path -LiteralPath (Join-Path $runtimeRoot 'chroma\manifest_sections.json'))) {
    throw 'Falta preparar el corpus. Ejecute python -m mira_cu1.prepare con el entorno del proyecto.'
}
function Start-MiraService {
    param([string]$Label,[int]$Port,[string]$Executable,[string[]]$Arguments,[string]$Directory)
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
        Write-Host "$Label : puerto $Port ocupado; se conserva el proceso existente."
        return
    }
    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot "$Label.out.log") -RedirectStandardError (Join-Path $logRoot "$Label.err.log")
    Write-Host "$Label iniciado (PID $($process.Id), puerto $Port)."
}
Start-MiraService -Label 'mcp' -Port 8001 -Executable $pythonExe -Arguments @('-m','mira_cu1.mcp_server') -Directory $repoRoot
Start-MiraService -Label 'api' -Port 8002 -Executable $pythonExe -Arguments @('-m','mira_cu1.main') -Directory $repoRoot
$nodeExe = (Get-Command node -ErrorAction Stop).Source
Start-MiraService -Label 'web' -Port 3000 -Executable $nodeExe -Arguments @('node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3000') -Directory (Join-Path $repoRoot 'frontend')
Write-Host 'Abra http://localhost:3000/asistente después de unos segundos.'
Write-Host 'Modo demo: no utiliza Gemini ni una clave API. Logs y temporales en entrega3/var.'
