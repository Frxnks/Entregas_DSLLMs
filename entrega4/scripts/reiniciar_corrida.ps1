# Deja el caso listo para una corrida nueva. Se niega a correr en la rama main.
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$rama = (git branch --show-current).Trim()
if ($rama -eq "main") {
    Write-Error "Rama actual: main. Crea una rama de corrida (git switch -c corrida-<n>) antes de reiniciar."
    exit 1
}
Write-Host "Rama: $rama"

$borrar = @()
$borrar += Get-ChildItem "docs/trabajo" -File | Where-Object { $_.Name -match '^0[2-7]-.*\.md$' }
$borrar += Get-ChildItem "src/mira_decision" -File -Filter *.py | Where-Object { $_.Name -notin @("__init__.py", "demo.py") }
if (Test-Path "tests") { $borrar += Get-ChildItem "tests" -File -Filter "test_*.py" }

foreach ($f in $borrar) {
    Remove-Item $f.FullName -Force
    Write-Host "Borrado: $($f.FullName.Substring($raiz.Length + 1))"
}

Set-Content -Path "docs/evidencia/traza-herramientas.jsonl" -Value "" -NoNewline
Write-Host "Vaciado: docs/evidencia/traza-herramientas.jsonl"
Write-Host "Conservado: docs/trabajo/01-necesidad.md. Total borrados: $($borrar.Count)"
