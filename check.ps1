[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot
. (Join-Path $PSScriptRoot 'scripts\common.ps1')

$failures = 0
$warnings = 0

function Write-Pass {
    param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-WarnItem {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
    $script:warnings++
}

function Write-FailItem {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    $script:failures++
}

function Test-DockerDaemon {
    try {
        & docker info *> $null
        return $true
    }
    catch {
        return $false
    }
}

function Check-Git {
    if (Test-SparkCommand 'git') {
        Write-Pass "git is available: $(& git --version 2>$null)"
    }
    else {
        Write-WarnItem 'git is not installed; updates via install.ps1 will not work'
    }
}

function Check-Python {
    $pythonCommand = Get-Command py -ErrorAction SilentlyContinue
    if ($null -eq $pythonCommand) {
        $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    }

    if ($null -eq $pythonCommand) {
        Write-FailItem 'Python 3 is not installed'
        return
    }

    try {
        $version = if ($pythonCommand.Name -eq 'py') { & py -3 --version 2>&1 } else { & python --version 2>&1 }
        Write-Pass "Python is available: $version"
    }
    catch {
        Write-FailItem 'Python is installed but failed to report its version'
    }

    if (Test-Path '.venv\Scripts\python.exe') {
        Write-Pass 'Python virtual environment exists'
        try {
            $pipVersion = & .\.venv\Scripts\python.exe -m pip --version 2>&1
            Write-Pass "pip is available in .venv: $pipVersion"
        }
        catch {
            Write-FailItem 'pip is not usable inside .venv'
        }
    }
    else {
        Write-WarnItem 'Python virtual environment .venv has not been created yet'
    }
}

function Check-Frontend {
    if (Test-Path $script:SparkDistIndex) {
        if (Test-SparkFrontendNeedsBuild) {
            Write-WarnItem 'Frontend bundle exists but is outdated'
        }
        else {
            Write-Pass 'Frontend bundle is present and up to date'
        }
    }
    else {
        Write-WarnItem 'Frontend bundle is missing'
    }

    if (Test-SparkFrontendNeedsBuild) {
        if (Test-SparkCommand 'node') {
            $major = Get-SparkNodeMajorVersion
            if ($major -ge $script:SparkNodeMajor) {
                Write-Pass "Node.js is available for frontend rebuilds: $(& node --version 2>$null)"
            }
            else {
                Write-FailItem "Node.js $($script:SparkNodeMajor).x or newer is required, found $(& node --version 2>$null)"
            }
        }
        else {
            Write-FailItem 'Node.js is required because the frontend needs to be rebuilt'
        }

        if (Test-SparkCommand 'npm') {
            Write-Pass "npm is available: $(& npm --version 2>$null)"
        }
        else {
            Write-FailItem 'npm is required because the frontend needs to be rebuilt'
        }
    }
    else {
        if (Test-SparkCommand 'node') {
            Write-Pass "Node.js is available: $(& node --version 2>$null)"
        }
        else {
            Write-WarnItem 'Node.js is not installed, but the current frontend bundle can still be served'
        }

        if (Test-SparkCommand 'npm') {
            Write-Pass "npm is available: $(& npm --version 2>$null)"
        }
        else {
            Write-WarnItem 'npm is not installed, but it is only needed when rebuilding the frontend'
        }
    }
}

function Check-Docker {
    if (Test-SparkCommand 'docker') {
        Write-Pass "Docker CLI is available: $(& docker --version 2>$null)"
    }
    else {
        Write-FailItem 'Docker CLI is not installed'
        return
    }

    if (Test-DockerDaemon) {
        Write-Pass 'Docker daemon is reachable'
    }
    else {
        Write-FailItem 'Docker daemon is not reachable'
    }
}

function Check-Files {
    if (Test-Path 'requirements.txt') {
        Write-Pass 'Backend requirements file is present'
    }
    else {
        Write-FailItem 'requirements.txt is missing'
    }

    if (Test-Path 'daemon\main.py') {
        Write-Pass 'Backend entrypoint is present'
    }
    else {
        Write-FailItem 'daemon\main.py is missing'
    }

    if (Test-Path (Join-Path $script:SparkFrontendDir 'package.json')) {
        Write-Pass 'Frontend package manifest is present'
    }
    else {
        Write-FailItem 'frontend/package.json is missing'
    }

    if (Test-Path 'data') {
        Write-Pass 'Data directory exists'
    }
    else {
        Write-WarnItem 'Data directory does not exist yet; it will be created on first start'
    }
}

function Check-Port {
    if (Test-SparkPortAvailable -Port $script:SparkPort) {
        Write-Pass "Port $($script:SparkPort) is available"
    }
    else {
        Write-FailItem "Port $($script:SparkPort) is already in use"
    }
}

Write-Host ''
Write-Host '  Spark AI Hub Environment Check (Windows)'
Write-Host '  ========================================'
Write-Host ''

Check-Git
Check-Python
Check-Frontend
Check-Docker
Check-Files
Check-Port

Write-Host ''
Write-Host "[spark-ai-hub] Summary: $failures failure(s), $warnings warning(s)"

if ($failures -gt 0) {
    Write-Host '[spark-ai-hub] Environment check failed. Resolve the issues above before running Spark AI Hub.' -ForegroundColor Red
    exit 1
}

Write-Host '[spark-ai-hub] Environment looks ready.' -ForegroundColor Green
exit 0