from __future__ import annotations
from pydantic import BaseModel


class ContainerInfo(BaseModel):
    name: str
    status: str
    image: str = ""
    ports: dict[str, int | None] = {}
    cpu_percent: float = 0.0
    memory_mb: float = 0.0


class SystemMetrics(BaseModel):
    gpu_utilization: int = 0
    gpu_memory_used_mb: int = 0
    gpu_memory_total_mb: int = 0
    gpu_temperature: int = 0
    gpu_name: str = ""
    ram_used_gb: float = 0.0
    ram_total_gb: float = 0.0
    disk_used_gb: float = 0.0
    disk_total_gb: float = 0.0
    disk_free_gb: float = 0.0
