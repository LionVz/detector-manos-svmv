$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonDir = Join-Path $root "backend\src\main\python-service"
$springDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

function Find-Command {
    param(
        [Parameter(Mandatory = $true)]
        [string[]] $Candidates
    )

    foreach ($candidate in $Candidates) {
        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($command) {
            return $command.Source
        }
    }

    return $null
}

function Start-ServiceWindow {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Name,
        [Parameter(Mandatory = $true)]
        [string] $WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string] $CommandLine
    )

    $innerCommand = "Set-Location -LiteralPath '$WorkingDirectory'; `$Host.UI.RawUI.WindowTitle = '$Name'; $CommandLine"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $innerCommand | Out-Null
    Write-Host "Iniciado: $Name"
}

$pythonExe = Find-Command -Candidates @("py", "python", "python3")
$npmExe = Find-Command -Candidates @("npm")
$mavenWrapper = Join-Path $springDir "mvnw.cmd"
$mavenExe = if (Test-Path $mavenWrapper) { $mavenWrapper } else { Find-Command -Candidates @("mvn") }

$missing = @()
if (-not $pythonExe) { $missing += "Python (py o python)" }
if (-not $mavenExe) { $missing += "Maven (mvn o mvnw.cmd)" }
if (-not $npmExe) { $missing += "npm" }

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "Faltan herramientas para iniciar todo:" -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "Cuando esten instaladas, ejecuta de nuevo:"
    Write-Host ".\start-all.ps1"
    exit 1
}

if (-not (Test-Path (Join-Path $pythonDir "app.py"))) {
    throw "No se encontro backend\src\main\python-service\app.py"
}

if (-not (Test-Path (Join-Path $springDir "pom.xml"))) {
    throw "No se encontro backend\pom.xml"
}

if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
    throw "No se encontro frontend\package.json"
}

Write-Host "Levantando servicios..." -ForegroundColor Cyan

Start-ServiceWindow -Name "Python Service" -WorkingDirectory $pythonDir -CommandLine "& '$pythonExe' app.py"
Start-ServiceWindow -Name "Spring Boot" -WorkingDirectory $springDir -CommandLine "& '$mavenExe' spring-boot:run"
Start-ServiceWindow -Name "Angular Frontend" -WorkingDirectory $frontendDir -CommandLine "& '$npmExe' start"

Write-Host ""
Write-Host "Servicios lanzados en ventanas separadas:" -ForegroundColor Green
Write-Host "- Python: http://localhost:5000"
Write-Host "- Spring Boot: http://localhost:8080"
Write-Host "- Angular: http://localhost:4200"
