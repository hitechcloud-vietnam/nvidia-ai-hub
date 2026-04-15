#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
source ./scripts/common.sh

failures=0
warnings=0

echo ""
echo "  NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC Environment Check"
echo "  =============================="
echo ""

pass() {
    echo "[PASS] $1"
}

warn() {
    echo "[WARN] $1"
    warnings=$((warnings + 1))
}

fail() {
    echo "[FAIL] $1"
    failures=$((failures + 1))
}

check_python() {
    if spark_command_exists python3; then
        pass "python3 available: $(python3 --version 2>&1)"
    else
        fail "python3 is not installed"
        return
    fi

    if python3 -m venv --help >/dev/null 2>&1; then
        pass "python3-venv is available"
    else
        fail "python3-venv support is missing"
    fi

    if python3 -m pip --version >/dev/null 2>&1; then
        pass "pip is available"
    else
        fail "pip is not available for python3"
    fi

    if [ -d ".venv" ]; then
        pass "Python virtual environment exists"
    else
        warn "Python virtual environment .venv has not been created yet"
    fi
}

check_frontend() {
    if [ -f "$SPARK_AI_HUB_DIST_INDEX" ]; then
        if spark_frontend_needs_build; then
            warn "Frontend bundle exists but is outdated"
        else
            pass "Frontend bundle is present and up to date"
        fi
    else
        warn "Frontend bundle is missing"
    fi

    if spark_frontend_needs_build; then
        if spark_command_exists node; then
            local major
            major="$(spark_node_major_version)"
            if [ "$major" -ge "$SPARK_AI_HUB_NODE_MAJOR" ]; then
                pass "Node.js is available for frontend rebuilds: $(node --version 2>/dev/null)"
            else
                fail "Node.js ${SPARK_AI_HUB_NODE_MAJOR}.x or newer is required, found $(node --version 2>/dev/null || echo unknown)"
            fi
        else
            fail "Node.js is required because the frontend needs to be rebuilt"
        fi

        if spark_command_exists npm; then
            pass "npm is available: $(npm --version 2>/dev/null)"
        else
            fail "npm is required because the frontend needs to be rebuilt"
        fi
    else
        if spark_command_exists node; then
            pass "Node.js is available: $(node --version 2>/dev/null)"
        else
            warn "Node.js is not installed, but the current frontend bundle can still be served"
        fi

        if spark_command_exists npm; then
            pass "npm is available: $(npm --version 2>/dev/null)"
        else
            warn "npm is not installed, but it is only needed when rebuilding the frontend"
        fi
    fi
}

check_docker() {
    if spark_command_exists docker; then
        pass "Docker CLI is available: $(docker --version 2>/dev/null)"
    else
        fail "Docker CLI is not installed"
        return
    fi

    if docker info >/dev/null 2>&1; then
        pass "Docker daemon is reachable"
    else
        fail "Docker daemon is not reachable"
    fi
}

check_git() {
    if spark_command_exists git; then
        pass "git is available: $(git --version 2>/dev/null)"
    else
        warn "git is not installed; updates via install.sh will not work"
    fi
}

check_files() {
    if [ -f "requirements.txt" ]; then
        pass "Backend requirements file is present"
    else
        fail "requirements.txt is missing"
    fi

    if [ -f "daemon/main.py" ]; then
        pass "Backend entrypoint is present"
    else
        fail "daemon/main.py is missing"
    fi

    if [ -f "$SPARK_AI_HUB_FRONTEND_DIR/package.json" ]; then
        pass "Frontend package manifest is present"
    else
        fail "frontend/package.json is missing"
    fi

    if [ -d "data" ]; then
        pass "Data directory exists"
    else
        warn "Data directory does not exist yet; it will be created on first start"
    fi
}

check_port() {
    if ! spark_command_exists python3; then
        return
    fi

    if python3 - "$SPARK_AI_HUB_PORT" <<'PY'
import socket
import sys

port = int(sys.argv[1])
sock = socket.socket()
try:
    sock.bind(("0.0.0.0", port))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
    then
        pass "Port $SPARK_AI_HUB_PORT is available"
    else
        fail "Port $SPARK_AI_HUB_PORT is already in use"
    fi
}

check_git
check_python
check_frontend
check_docker
check_files
check_port

echo ""
echo "[nvidia-ai-hub] Summary: ${failures} failure(s), ${warnings} warning(s)"

if [ "$failures" -gt 0 ]; then
    echo "[nvidia-ai-hub] Environment check failed. Resolve the issues above before running NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC."
    exit 1
fi

echo "[nvidia-ai-hub] Environment looks ready."
exit 0