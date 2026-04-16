from __future__ import annotations
from pydantic import BaseModel, Field


class ContainerInfo(BaseModel):
    name: str
    status: str
    image: str = ""
    ports: dict[str, int | None] = {}
    cpu_percent: float = 0.0
    memory_mb: float = 0.0


class GpuMetrics(BaseModel):
    index: int = 0
    name: str = ""
    vendor: str = ""
    driver_version: str = ""
    uuid: str = ""
    compute_capability: str = ""
    utilization: int = 0
    utilization_source: str = ""
    memory_used_mb: int = 0
    memory_total_mb: int = 0
    temperature: float = 0.0
    temperature_source: str = ""
    power_draw_watts: float = 0.0
    power_limit_watts: float = 0.0
    fan_speed_percent: int = 0


class SystemMetrics(BaseModel):
    platform: str = ""
    hostname: str = ""
    uptime_seconds: int = 0
    cpu_percent: float = 0.0
    cpu_cores_logical: int = 0
    cpu_cores_physical: int = 0
    cpu_frequency_mhz: float = 0.0
    cpu_temperature: float = 0.0
    cpu_temperature_source: str = ""
    gpu_utilization: int = 0
    gpu_memory_used_mb: int = 0
    gpu_memory_total_mb: int = 0
    gpu_temperature: float = 0.0
    gpu_temperature_source: str = ""
    gpu_name: str = ""
    gpu_compute_capability: str = ""
    gpu_count: int = 0
    gpus: list[GpuMetrics] = Field(default_factory=list)
    ram_used_gb: float = 0.0
    ram_total_gb: float = 0.0
    ram_percent: float = 0.0
    disk_used_gb: float = 0.0
    disk_total_gb: float = 0.0
    disk_free_gb: float = 0.0
    disk_percent: float = 0.0
