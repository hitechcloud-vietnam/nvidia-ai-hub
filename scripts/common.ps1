Set-StrictMode -Version Latest

$script:SparkPort = 9000
$script:SparkNodeMajor = 22
$script:SparkFrontendDir = 'frontend'
$script:SparkDistIndex = Join-Path $script:SparkFrontendDir 'dist\index.html'

function Test-SparkCommand {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-SparkNodeMajorVersion {
    if (-not (Test-SparkCommand 'node')) {
        return 0
    }

    try {
        return [int](& node -p "process.versions.node.split('.')[0]")
    }
    catch {
        return 0
    }
}

function Get-SparkNpmInstallArgs {
    if (Test-Path (Join-Path $script:SparkFrontendDir 'package-lock.json')) {
        return @('ci', '--no-fund', '--no-audit')
    }

    return @('install', '--no-fund', '--no-audit')
}

function Test-SparkFrontendNeedsBuild {
    if (-not (Test-Path $script:SparkDistIndex)) {
        return $true
    }

    $distTime = (Get-Item $script:SparkDistIndex).LastWriteTimeUtc
    $candidateFiles = @(
        (Join-Path $script:SparkFrontendDir 'package.json'),
        (Join-Path $script:SparkFrontendDir 'package-lock.json'),
        (Join-Path $script:SparkFrontendDir 'index.html'),
        (Join-Path $script:SparkFrontendDir 'vite.config.js')
    )

    foreach ($candidate in $candidateFiles) {
        if ((Test-Path $candidate) -and ((Get-Item $candidate).LastWriteTimeUtc -gt $distTime)) {
            return $true
        }
    }

    foreach ($sourceDir in @((Join-Path $script:SparkFrontendDir 'src'), (Join-Path $script:SparkFrontendDir 'public'))) {
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

function Test-SparkFrontendToolchainReady {
    if (-not (Test-SparkCommand 'node') -or -not (Test-SparkCommand 'npm')) {
        return $false
    }

    return (Get-SparkNodeMajorVersion) -ge $script:SparkNodeMajor
}

function Install-SparkFrontendDependencies {
    Push-Location (Join-Path (Get-Location).Path $script:SparkFrontendDir)
    try {
        & npm @(Get-SparkNpmInstallArgs)
    }
    finally {
        Pop-Location
    }
}

function Build-SparkFrontend {
    Push-Location (Join-Path (Get-Location).Path $script:SparkFrontendDir)
    try {
        & npm run build
    }
    finally {
        Pop-Location
    }
}

function Test-SparkPortAvailable {
    param([int]$Port = $script:SparkPort)

    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($null -ne $listener) {
            $listener.Stop()
        }
    }
}