[CmdletBinding()]
param(
    [switch]$KeepData
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$InstallDir = Join-Path $HOME 'spark-ai-hub'
$preservedDataTemp = $null

function Write-Section {
    param([string]$Message)
    Write-Host "[spark-ai-hub] $Message" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Remove-PathIfExists {
    param(
        [string]$Path,
        [string]$Label
    )

    if (Test-Path $Path) {
        Write-Section "Removing $Label..."
        Remove-Item -Path $Path -Recurse -Force
    }
    else {
        Write-Section "$Label not found, skipping."
    }
}

Write-Host ''
Write-Host '  Spark AI Hub Uninstaller (Windows)'
Write-Host '  =================================='
Write-Host ''

if (Test-Command 'docker') {
    $containers = & docker ps -a --filter 'name=spark-ai-hub-' --format '{{.Names}}' 2>$null

    if (-not [string]::IsNullOrWhiteSpace(($containers | Out-String))) {
        Write-Host 'Installed apps found:'
        foreach ($container in $containers) {
            Write-Host "  - $container"
        }
        Write-Host ''

        $removeApps = Read-Host 'Remove all installed apps, their images, and volumes? [y/N]'
        if ($removeApps -match '^[Yy]$') {
            $projects = & docker ps -a --filter 'name=spark-ai-hub-' --format '{{.Labels}}' 2>$null |
                Select-String -Pattern 'com\.docker\.compose\.project=(spark-ai-hub-[^ ,]+)' -AllMatches |
                ForEach-Object { $_.Matches } |
                ForEach-Object { $_.Groups[1].Value } |
                Sort-Object -Unique

            if ($projects) {
                Write-Section 'Stopping and removing recipe containers...'
                foreach ($project in $projects) {
                    Write-Host "  - $project"
                    & docker compose -p $project down --rmi all --volumes 2>$null
                }
            }

            $remaining = & docker ps -a --filter 'name=spark-ai-hub-' --format '{{.ID}}' 2>$null
            if ($remaining) {
                Write-Section 'Removing leftover containers...'
                & docker rm -f $remaining 2>$null
            }

            $volumes = & docker volume ls --filter 'name=spark-ai-hub' --format '{{.Name}}' 2>$null
            if ($volumes) {
                Write-Section 'Removing volumes...'
                & docker volume rm $volumes 2>$null
            }
        }
        else {
            Write-Section 'Keeping installed apps.'
        }
    }
}

if (Test-Path $InstallDir) {
    Remove-PathIfExists -Path (Join-Path $InstallDir '.venv') -Label 'backend virtual environment'

    if ($KeepData -and (Test-Path (Join-Path $InstallDir 'data'))) {
        $preservedDataTemp = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $preservedDataTemp -Force | Out-Null
        Write-Section 'Preserving backend runtime data...'
        Move-Item -Path (Join-Path $InstallDir 'data') -Destination (Join-Path $preservedDataTemp 'data')
    }
    else {
        Remove-PathIfExists -Path (Join-Path $InstallDir 'data') -Label 'backend runtime data'
    }

    Remove-PathIfExists -Path (Join-Path $InstallDir 'frontend\node_modules') -Label 'frontend node_modules cache'
    Remove-PathIfExists -Path (Join-Path $InstallDir 'frontend\dist') -Label 'frontend build output'

    $recipesDir = Join-Path $InstallDir 'registry\recipes'
    if (Test-Path $recipesDir) {
        Write-Section 'Removing generated recipe environment files...'
        Get-ChildItem -Path $recipesDir -Filter '.env' -File -Recurse -ErrorAction SilentlyContinue |
            ForEach-Object {
                Write-Host $_.FullName
                Remove-Item -Path $_.FullName -Force
            }
    }

    Write-Section 'Removing Python cache directories...'
    Get-ChildItem -Path $InstallDir -Directory -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -in @('__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache') } |
        ForEach-Object {
            Write-Host $_.FullName
            Remove-Item -Path $_.FullName -Recurse -Force
        }
}
else {
    Write-Section "$InstallDir not found, skipping cache cleanup."
}

Remove-PathIfExists -Path $InstallDir -Label $InstallDir

if ($KeepData -and $null -ne $preservedDataTemp -and (Test-Path (Join-Path $preservedDataTemp 'data'))) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Move-Item -Path (Join-Path $preservedDataTemp 'data') -Destination (Join-Path $InstallDir 'data')
    Remove-Item -Path $preservedDataTemp -Recurse -Force
    Write-Section "Preserved data restored to $(Join-Path $InstallDir 'data')"
}

Write-Host ''
Write-Section 'Uninstall complete.'
Write-Host ''