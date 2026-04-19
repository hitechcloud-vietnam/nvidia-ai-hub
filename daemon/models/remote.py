from typing import Literal

from pydantic import BaseModel, Field


RemoteProtocol = Literal["ssh", "sftp", "rdp", "vnc", "http", "https"]


class RemoteSessionBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    protocol: RemoteProtocol
    host: str = Field(min_length=1, max_length=255)
    port: int | None = Field(default=None, ge=1, le=65535)
    username: str = Field(default="", max_length=120)
    remote_path: str = Field(default="", max_length=512)
    description: str = Field(default="", max_length=2000)
    password_hint: str = Field(default="", max_length=255)


class RemoteSessionUpsert(RemoteSessionBase):
    id: str | None = Field(default=None, max_length=120)


class RemoteSessionRecord(RemoteSessionBase):
    id: str
    created_at: str
    updated_at: str


class RemoteTerminalConnectRequest(BaseModel):
    type: Literal["connect"] = "connect"
    password: str | None = Field(default=None, max_length=2048)
    cols: int = Field(default=120, ge=20, le=400)
    rows: int = Field(default=30, ge=10, le=200)


class RemoteTerminalInput(BaseModel):
    type: Literal["input", "resize", "disconnect"]
    data: str = ""
    cols: int | None = Field(default=None, ge=20, le=400)
    rows: int | None = Field(default=None, ge=10, le=200)
