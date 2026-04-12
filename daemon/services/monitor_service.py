from __future__ import annotations
import asyncio
import shutil
from daemon.models.container import SystemMetrics


async def get_system_metrics() -> SystemMetrics:
    metrics = SystemMetrics()

    # GPU metrics via nvidia-smi
    try:
        proc = await asyncio.create_subprocess_exec(
            "nvidia-smi",
            "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,name",
            "--format=csv,noheader,nounits",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        if proc.returncode == 0:
            line = stdout.decode().strip().splitlines()[0]
            parts = [p.strip() for p in line.split(",")]

            def safe_int(val):
                try:
                    return int(val)
                except (ValueError, TypeError):
                    return 0

            metrics.gpu_utilization = safe_int(parts[0])
            metrics.gpu_memory_used_mb = safe_int(parts[1])
            metrics.gpu_memory_total_mb = safe_int(parts[2])
            metrics.gpu_temperature = safe_int(parts[3])
            metrics.gpu_name = parts[4] if len(parts) > 4 else ""
    except Exception:
        pass

    # RAM via /proc/meminfo
    try:
        with open("/proc/meminfo") as f:
            meminfo = {}
            for line in f:
                key, val = line.split(":")
                meminfo[key.strip()] = int(val.strip().split()[0])
            total_kb = meminfo.get("MemTotal", 0)
            available_kb = meminfo.get("MemAvailable", 0)
            metrics.ram_total_gb = round(total_kb / 1048576, 1)
            metrics.ram_used_gb = round((total_kb - available_kb) / 1048576, 1)
    except Exception:
        pass

    # Disk usage
    try:
        usage = shutil.disk_usage("/home")
        metrics.disk_total_gb = round(usage.total / (1024**3), 1)
        metrics.disk_used_gb = round(usage.used / (1024**3), 1)
        metrics.disk_free_gb = round(usage.free / (1024**3), 1)
    except Exception:
        pass

    return metrics
