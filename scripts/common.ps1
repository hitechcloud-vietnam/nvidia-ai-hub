Set-StrictMode -Version Latest

function Initialize-SparkConfig {
    param([string]$Root = (Get-Location).Path)

    $script:SparkRoot = $Root
    $script:SparkEnvFile = Join-Path $script:SparkRoot '.env'
    $values = @{}

    if (Test-Path $script:SparkEnvFile) {
        foreach ($line in Get-Content $script:SparkEnvFile) {
            $trimmed = $line.Trim()
            if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
                continue
            }

            $parts = $trimmed -split '=', 2
            if ($parts.Count -eq 2) {
                $values[$parts[0].Trim()] = $parts[1].Trim()
            }
        }
    }

    $script:SparkHost = if ($env:SPARK_AI_HUB_HOST) { $env:SPARK_AI_HUB_HOST } elseif ($values.ContainsKey('SPARK_AI_HUB_HOST')) { $values['SPARK_AI_HUB_HOST'] } else { '0.0.0.0' }
    $script:SparkPort = if ($env:SPARK_AI_HUB_PORT) { [int]$env:SPARK_AI_HUB_PORT } elseif ($values.ContainsKey('SPARK_AI_HUB_PORT')) { [int]$values['SPARK_AI_HUB_PORT'] } else { 9000 }
    $script:SparkNodeMajor = if ($env:SPARK_AI_HUB_NODE_MAJOR) { [int]$env:SPARK_AI_HUB_NODE_MAJOR } elseif ($values.ContainsKey('SPARK_AI_HUB_NODE_MAJOR')) { [int]$values['SPARK_AI_HUB_NODE_MAJOR'] } else { 22 }
    $script:SparkFrontendDirName = if ($env:SPARK_AI_HUB_FRONTEND_DIR) { $env:SPARK_AI_HUB_FRONTEND_DIR } elseif ($values.ContainsKey('SPARK_AI_HUB_FRONTEND_DIR')) { $values['SPARK_AI_HUB_FRONTEND_DIR'] } else { 'frontend' }
    $script:SparkFrontendDir = Join-Path $script:SparkRoot $script:SparkFrontendDirName
    $script:SparkDistIndex = Join-Path $script:SparkFrontendDir 'dist\index.html'
}

function Test-SparkValidPort {
    param([int]$Port)
    return $Port -ge 1 -and $Port -le 65535
}

function Set-SparkPort {
    param([int]$Port)

    if (-not (Test-SparkValidPort -Port $Port)) {
        throw 'Port must be between 1 and 65535.'
    }

    $env:SPARK_AI_HUB_PORT = [string]$Port
    $script:SparkPort = $Port
}

function Set-SparkEnvValue {
    param(
        [string]$Key,
        [string]$Value
    )

    if (-not (Test-Path $script:SparkEnvFile)) {
        New-Item -ItemType File -Path $script:SparkEnvFile -Force | Out-Null
    }

    $lines = @()
    if (Test-Path $script:SparkEnvFile) {
        $lines = Get-Content $script:SparkEnvFile
    }

    $updated = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^$([regex]::Escape($Key))=") {
            $lines[$i] = "$Key=$Value"
            $updated = $true
            break
        }
    }

    if (-not $updated) {
        $lines += "$Key=$Value"
    }

    Set-Content -Path $script:SparkEnvFile -Value $lines
    $env:$Key = $Value
    Initialize-SparkConfig -Root $script:SparkRoot
}

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
    Push-Location $script:SparkFrontendDir
    try {
        & npm @(Get-SparkNpmInstallArgs)
    }
    finally {
        Pop-Location
    }
}

function Build-SparkFrontend {
    Push-Location $script:SparkFrontendDir
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

Initialize-SparkConfig