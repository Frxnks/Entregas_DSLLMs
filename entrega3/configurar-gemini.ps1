$ErrorActionPreference = 'Stop'
$configPath = Join-Path $PSScriptRoot 'service\.env'
if (Test-Path -LiteralPath $configPath) {
    throw 'Ya existe service/.env. Edítelo localmente para conservar su configuración.'
}
$secret = Read-Host 'Pegue la clave de Gemini (entrada oculta)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ($key -notmatch '^[A-Za-z0-9_.-]{20,}$') { throw 'Formato de clave no válido.' }
    $template = Get-Content (Join-Path $PSScriptRoot 'service\.env.example') -Raw
    $config = $template -replace '(?m)^GEMINI_API_KEY=.*$', ('GEMINI_API_KEY=' + $key)
    [IO.File]::WriteAllText($configPath, $config, [Text.UTF8Encoding]::new($false))
    Write-Host 'Clave guardada localmente. No se ha hecho ninguna llamada ni activado facturación.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $key = $null
    $config = $null
}
