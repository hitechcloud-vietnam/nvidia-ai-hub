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


class GpuTopologyLink(BaseModel):
    target_index: int = 0
    target_label: str = ""
    link_type: str = ""
    bandwidth_class: str = ""


class GpuTopologyRow(BaseModel):
    gpu_index: int = 0
    gpu_label: str = ""
    links: list[GpuTopologyLink] = Field(default_factory=list)


class GpuTopologySnapshot(BaseModel):
    detected: bool = False
    source: str = ""
    multi_gpu: bool = False
    peer_to_peer_capable: bool = False
    nvlink_pairs: int = 0
    rows: list[GpuTopologyRow] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class DeploymentSelection(BaseModel):
    profile: str = "single-gpu"
    strategy: str = "local-ui"
    target_gpu_indices: list[int] = Field(default_factory=list)
    target_hosts: list[str] = Field(default_factory=list)
    shared_storage_path: str = ""
    notes: str = ""
    updated_at: int = 0


class DeploymentProfileRecommendation(BaseModel):
    profile: str
    label: str
    supported: bool = False
    recommended: bool = False
    rationale: str = ""
    strategy: str = ""
    gpu_count: int = 0
    target_gpu_indices: list[int] = Field(default_factory=list)
    target_hosts: list[str] = Field(default_factory=list)
    caveats: list[str] = Field(default_factory=list)


class DeploymentPlan(BaseModel):
    slug: str
    host_hostname: str = ""
    available_gpu_count: int = 0
    available_gpu_indices: list[int] = Field(default_factory=list)
    needs_gpu: bool = True
    shared_storage_ready: bool = False
    network_ready: bool = False
    topology: GpuTopologySnapshot = Field(default_factory=GpuTopologySnapshot)
    selected: DeploymentSelection = Field(default_factory=DeploymentSelection)
    recommendations: list[DeploymentProfileRecommendation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class RecipeMetrics(BaseModel):
    slug: str
    running: bool = False
    container_count: int = 0
    cpu_percent: float = 0.0
    memory_used_mb: float = 0.0
    memory_limit_mb: float = 0.0
    memory_percent: float = 0.0
    gpu_name: str = ""
    gpu_utilization: int = 0
    gpu_memory_used_mb: int = 0
    gpu_memory_total_mb: int = 0
    temperature: float = 0.0
    temperature_source: str = ""
    telemetry_source: str = ""
    updated_at: int = 0


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
