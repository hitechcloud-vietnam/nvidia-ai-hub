[CmdletBinding()]
param(
    [int]$Port
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot
. (Join-Path $PSScriptRoot 'scripts\common.ps1')

if ($PSBoundParameters.ContainsKey('Port')) {
    if (-not (Test-SparkValidPort -Port $Port)) {
        throw 'Port must be between 1 and 65535.'
    }

    Set-SparkPort -Port $Port
}

function Write-Section {
    param([string]$Message)
    Write-Host "[spark-ai-hub] $Message" -ForegroundColor Cyan
}

if (-not (Test-Path '.venv\Scripts\python.exe')) {
    Write-Section 'Creating virtual environment...'
    if (Get-Command py -ErrorAction SilentlyContinue) {
        & py -3 -m venv .venv
    }
    elseif (Get-Command python -ErrorAction SilentlyContinue) {
        & python -m venv .venv
    }
    else {
        throw 'Python 3 is not installed. Run install.ps1 first.'
    }
}

$venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'

Write-Section 'Installing Python dependencies...'
& $venvPython -m pip install -r requirements.txt

if (Test-SparkFrontendNeedsBuild) {
    if (-not (Test-SparkCommand 'node') -or -not (Test-SparkCommand 'npm')) {
        Write-Host '[spark-ai-hub] Frontend build is missing or outdated, but Node.js/npm is not available.' -ForegroundColor Red
        Write-Host '[spark-ai-hub] Please run install.ps1 to provision frontend build dependencies.' -ForegroundColor Red
        exit 1
    }

    if (-not (Test-SparkFrontendToolchainReady)) {
        Write-Host "[spark-ai-hub] Node.js $($script:SparkNodeMajor).x or newer is required to rebuild the frontend." -ForegroundColor Red
        Write-Host '[spark-ai-hub] Please run install.ps1 to install the required Node.js version.' -ForegroundColor Red
        exit 1
    }

    Write-Section 'Installing frontend dependencies...'
    Install-SparkFrontendDependencies

    Write-Section 'Building frontend...'
    Build-SparkFrontend
}
else {
    Write-Section 'Frontend build is up to date.'
}

Write-Section "Starting Spark AI Hub on port $($script:SparkPort)..."
Write-Section "Open http://localhost:$($script:SparkPort) in your browser"
$env:SPARK_AI_HUB_PORT = [string]$script:SparkPort
& $venvPython -m uvicorn daemon.main:app --host $script:SparkHost --port $script:SparkPort