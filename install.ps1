[CmdletBinding()]
param(
    [switch]$NoStart,
    [int]$Port,
    [Alias('Host')]
    [string]$ListenHost
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot
. (Join-Path $PSScriptRoot 'scripts\common.ps1')

$Repo = 'https://github.com/hitechcloud-vietnam/spark-ai-hub.git'
$InstallDir = Join-Path $HOME 'spark-ai-hub'
$script:PythonLauncher = @()

function Write-Section {
    param([string]$Message)
    Write-Host "[spark-ai-hub] $Message" -ForegroundColor Cyan
}

function Refresh-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = ($machinePath, $userPath -join ';').Trim(';')
}

function Test-Command {
    param([string]$Name)
    return Test-SparkCommand $Name
}

function Install-WithWinget {
    param(
        [string]$Id,
        [string]$DisplayName
    )

    if (-not (Test-Command 'winget')) {
        throw "winget is required to install $DisplayName automatically. Install it manually, then re-run install.ps1."
    }

    Write-Section "Installing $DisplayName with winget..."
    & winget install --id $Id --exact --accept-source-agreements --accept-package-agreements --silent
    Refresh-Path
}

function Set-PythonLauncher {
    if (Test-Command 'py') {
        $script:PythonLauncher = @('py', '-3')
        return
    }

    if (Test-Command 'python') {
        $script:PythonLauncher = @('python')
        return
    }

    $script:PythonLauncher = @()
}

function Invoke-Python {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

    if ($script:PythonLauncher.Count -eq 0) {
        throw 'Python launcher is not configured.'
    }

    $launcher = $script:PythonLauncher[0]
    $launcherArgs = @()
    if ($script:PythonLauncher.Count -gt 1) {
        $launcherArgs = $script:PythonLauncher[1..($script:PythonLauncher.Count - 1)]
    }

    & $launcher @launcherArgs @Arguments
}

function Ensure-Git {
    if (Test-Command 'git') {
        return
    }

    Install-WithWinget -Id 'Git.Git' -DisplayName 'Git'

    if (-not (Test-Command 'git')) {
        throw 'Git installation did not complete successfully.'
    }
}

function Ensure-Python {
    Set-PythonLauncher
    if ($script:PythonLauncher.Count -eq 0) {
        Install-WithWinget -Id 'Python.Python.3.12' -DisplayName 'Python 3'
        Set-PythonLauncher
    }

    if ($script:PythonLauncher.Count -eq 0) {
        throw 'Python 3 installation did not complete successfully.'
    }
}

function Ensure-Node {
    if ((Get-SparkNodeMajorVersion) -ge $script:SparkNodeMajor) {
        return
    }

    Install-WithWinget -Id 'OpenJS.NodeJS.LTS' -DisplayName 'Node.js LTS'

    if ((Get-SparkNodeMajorVersion) -lt $script:SparkNodeMajor) {
        throw "Node.js $($script:SparkNodeMajor) or newer is required to build the frontend."
    }
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

function Start-DockerDesktopIfAvailable {
    $candidates = @(
        (Join-Path $Env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path $Env:LocalAppData 'Programs\Docker\Docker\Docker Desktop.exe')
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            Write-Section 'Starting Docker Desktop...'
            Start-Process -FilePath $candidate | Out-Null
            return
        }
    }
}

function Ensure-Docker {
    if (-not (Test-Command 'docker')) {
        Install-WithWinget -Id 'Docker.DockerDesktop' -DisplayName 'Docker Desktop'
        Refresh-Path
    }

    if (-not (Test-Command 'docker')) {
        throw 'Docker installation did not complete successfully.'
    }

    if (-not (Test-DockerDaemon)) {
        Start-DockerDesktopIfAvailable
        Write-Warning 'Docker Desktop is installed but the Docker daemon is not ready yet. Start Docker Desktop before using recipes.'
    }
}

Write-Host ''
Write-Host '  Spark AI Hub Windows Installer'
Write-Host '  =============================='
Write-Host ''

Ensure-Git
Ensure-Python
Ensure-Node
Ensure-Docker

if (Test-Path $InstallDir) {
    Write-Section 'Updating existing installation...'
    & git -C $InstallDir pull --ff-only
}
else {
    Write-Section 'Cloning Spark AI Hub...'
    & git clone $Repo $InstallDir
}

Set-Location $InstallDir
. (Join-Path $InstallDir 'scripts\common.ps1')

Ensure-SparkEnvFile -Root $InstallDir

if ($PSBoundParameters.ContainsKey('Port')) {
    if (-not (Test-SparkValidPort -Port $Port)) {
        throw 'Port must be between 1 and 65535.'
    }

    Set-SparkEnvValue -Key 'SPARK_AI_HUB_PORT' -Value ([string]$Port)
}

if ($PSBoundParameters.ContainsKey('ListenHost')) {
    if (-not (Test-SparkValidHost -Host $ListenHost)) {
        throw 'Host must not be empty.'
    }

    Set-SparkEnvValue -Key 'SPARK_AI_HUB_HOST' -Value $ListenHost
}

if (-not (Test-Path '.venv')) {
    Write-Section 'Creating virtual environment...'
    Invoke-Python -m venv .venv
}

$venvPython = Join-Path $InstallDir '.venv\Scripts\python.exe'
if (-not (Test-Path $venvPython)) {
    throw 'Virtual environment Python executable was not found.'
}

Write-Section 'Upgrading pip...'
& $venvPython -m pip install --upgrade pip

Write-Section 'Installing Python dependencies...'
& $venvPython -m pip install -r requirements.txt

$shouldBuildFrontend = Test-SparkFrontendNeedsBuild

Write-Section 'Installing frontend dependencies...'
Install-SparkFrontendDependencies

if ($shouldBuildFrontend) {
    Write-Section 'Building frontend...'
    Build-SparkFrontend
}
else {
    Write-Section 'Frontend build is up to date, skipping rebuild.'
}

Write-Host ''
Write-Section 'Installation complete!'
Write-Section 'Backend API and frontend UI are ready.'

if ($NoStart) {
    Write-Section 'NoStart was specified, so the server was not started.'
    Write-Section 'Run .\check.ps1 to verify the environment before launch.'
    Write-Section "Start later with: .\run.ps1 -Port $($script:SparkPort) -Host $($script:SparkHost)"
    Write-Host ''
    exit 0
}

Write-Section "Starting Spark AI Hub on port $($script:SparkPort)..."
Write-Section "Open http://localhost:$($script:SparkPort) in your browser"
Write-Host ''
$env:SPARK_AI_HUB_PORT = [string]$script:SparkPort
Set-Item -Path 'Env:SPARK_AI_HUB_HOST' -Value $script:SparkHost
& $venvPython -m uvicorn daemon.main:app --host $script:SparkHost --port $script:SparkPort