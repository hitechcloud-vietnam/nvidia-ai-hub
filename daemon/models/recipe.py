from __future__ import annotations
from pydantic import BaseModel


class RecipeRequirements(BaseModel):
    min_memory_gb: int = 8
    recommended_memory_gb: int | None = None
    disk_gb: int = 10
    cuda_compute: str = "12.1"


class RecipeUI(BaseModel):
    type: str = "web"
    port: int = 8080
    path: str = "/"
    health_path: str | None = None
    scheme: str = "http"
    insecure_skip_verify: bool = False


class RecipeDocker(BaseModel):
    build: bool = False
    build_time_minutes: int = 5
    gpu: bool = True


class RecipeIntegration(BaseModel):
    api_url: str = ""
    model_id: str = ""
    api_key: str = ""
    max_context: str = ""
    max_output_tokens: str = ""
    curl_example: str = ""


class RecipeCommand(BaseModel):
    label: str
    command: str
    description: str = ""


class RecipeRegistryUpdate(BaseModel):
    sha: str
    date: str = ""
    subject: str = ""


class RecipePlatformExportArtifact(BaseModel):
    label: str
    description: str = ""
    value: str = ""
    filename: str = ""
    mime_type: str = "text/plain;charset=utf-8"
    visible: bool = True


class RecipePlatformExports(BaseModel):
    metadata: str = ""
    deployment_profiles: str = ""
    sync_script: str = ""
    ssh_command: str = ""
    endpoint_summary: str = ""
    show_endpoint_summary: bool = True
    show_sync_script: bool = True
    show_ssh_command: bool = True
    artifacts: list[RecipePlatformExportArtifact] = []


class RecipeCommunityTip(BaseModel):
    id: int
    author: str = "Anonymous operator"
    content: str
    created_at: str = ""


class RecipeCommunitySummary(BaseModel):
    rating_average: float = 0.0
    rating_count: int = 0
    verified_count: int = 0
    tips_count: int = 0
    tips: list[RecipeCommunityTip] = []
    submit_recipe_url: str = ""


class Recipe(BaseModel):
    name: str
    slug: str
    version: str = "1.0.0"
    release_date: str = ""
    tokens_per_second: float | None = None
    description: str = ""
    author: str = ""
    website: str = ""
    upstream: str = ""
    fork: str = ""
    category: str = "llm"
    categories: list[str] = []
    tags: list[str] = []
    icon: str = ""
    logo: str = ""
    requirements: RecipeRequirements = RecipeRequirements()
    ui: RecipeUI = RecipeUI()
    docker: RecipeDocker = RecipeDocker()
    integration: RecipeIntegration | None = None
    commands: list[RecipeCommand] = []
    source: str = "community"  # nvidia-ai-hub | official | community
    status: str = "experimental"
    depends_on: list[str] = []
    requires_hf_token: bool = False
    runtime_env_path: str = ""

    # runtime state (not from yaml)
    installed: bool = False
    running: bool = False
    ready: bool = False
    starting: bool = False
    has_leftovers: bool = False
    registry_changed: bool = False
    registry_update_count: int = 0
    registry_updates: list[RecipeRegistryUpdate] = []
    platform_exports: RecipePlatformExports | None = None
    community: RecipeCommunitySummary = RecipeCommunitySummary()


class RecipeSummary(BaseModel):
    name: str
    slug: str
    version: str = "1.0.0"
    release_date: str = ""
    tokens_per_second: float | None = None
    description: str = ""
    author: str = ""
    category: str = "llm"
    categories: list[str] = []
    tags: list[str] = []
    icon: str = ""
    logo: str = ""
    requirements: RecipeRequirements = RecipeRequirements()
    ui: RecipeUI = RecipeUI()
    docker: RecipeDocker = RecipeDocker()
    source: str = "community"
    status: str = "experimental"
    requires_hf_token: bool = False
    runtime_env_path: str = ""

    # runtime state
    installed: bool = False
    running: bool = False
    ready: bool = False
    starting: bool = False
    has_leftovers: bool = False
    registry_changed: bool = False
    registry_update_count: int = 0
    registry_updates: list[RecipeRegistryUpdate] = []
    community: RecipeCommunitySummary = RecipeCommunitySummary()
