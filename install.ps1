[CmdletBinding()]
param(
    [switch]$NoStart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Repo = 'https://github.com/hitechcloud-vietnam/spark-ai-hub.git'
$InstallDir = Join-Path $HOME 'spark-ai-hub'
$Port = 9000
$NodeMajor = 22
$FrontendDir = 'frontend'
$DistIndex = Join-Path $FrontendDir 'dist\index.html'
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
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
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

function Get-NodeMajorVersion {
    if (-not (Test-Command 'node')) {
        return 0
    }

    try {
        return [int](& node -p "process.versions.node.split('.')[0]")
    }
    catch {
        return 0
    }
}

function Get-NpmInstallArgs {
    if (Test-Path 'package-lock.json') {
        return @('ci', '--no-fund', '--no-audit')
    }

    return @('install', '--no-fund', '--no-audit')
}

function Test-FrontendNeedsBuild {
    if (-not (Test-Path $DistIndex)) {
        return $true
    }

    $distTime = (Get-Item $DistIndex).LastWriteTimeUtc
    $candidateFiles = @(
        (Join-Path $FrontendDir 'package.json'),
        (Join-Path $FrontendDir 'package-lock.json'),
        (Join-Path $FrontendDir 'index.html'),
        (Join-Path $FrontendDir 'vite.config.js')
    )

    foreach ($candidate in $candidateFiles) {
        if ((Test-Path $candidate) -and ((Get-Item $candidate).LastWriteTimeUtc -gt $distTime)) {
            return $true
        }
    }

    foreach ($sourceDir in @((Join-Path $FrontendDir 'src'), (Join-Path $FrontendDir 'public'))) {
        if (-not (Test-Path $sourceDir)) {
            continue
        }

        $newerFile = Get-ChildItem -Path $sourceDir -File -Recurse | Where-Object {
            $_.LastWriteTimeUtc -gt $distTime
        } | Select-Object -First 1

        if ($null -ne $newerFile) {
            return $true
        }
    }

    return $false
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
    if ((Get-NodeMajorVersion) -ge $NodeMajor) {
        return
    }

    Install-WithWinget -Id 'OpenJS.NodeJS.LTS' -DisplayName 'Node.js LTS'

    if ((Get-NodeMajorVersion) -lt $NodeMajor) {
        throw "Node.js $NodeMajor or newer is required to build the frontend."
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

$shouldBuildFrontend = Test-FrontendNeedsBuild

Write-Section 'Installing frontend dependencies...'
Set-Location (Join-Path $InstallDir $FrontendDir)
& npm @(Get-NpmInstallArgs)

if ($shouldBuildFrontend) {
    Write-Section 'Building frontend...'
    & npm run build
}
else {
    Write-Section 'Frontend build is up to date, skipping rebuild.'
}

Set-Location $InstallDir

Write-Host ''
Write-Section 'Installation complete!'
Write-Section 'Backend API and frontend UI are ready.'

if ($NoStart) {
    Write-Section 'NoStart was specified, so the server was not started.'
    Write-Section 'Run .\check.sh in a Bash shell to verify the environment before launch.'
    Write-Section 'Start later with: .venv\Scripts\python.exe -m uvicorn daemon.main:app --host 0.0.0.0 --port 9000'
    Write-Host ''
    exit 0
}

Write-Section "Starting Spark AI Hub on port $Port..."
Write-Section "Open http://localhost:$Port in your browser"
Write-Host ''
& $venvPython -m uvicorn daemon.main:app --host 0.0.0.0 --port $Port