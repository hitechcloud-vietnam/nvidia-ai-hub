from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException, Request, Response

app = FastAPI(title="vLLM Multi-Model Gateway")

ROUTE_PREFIX = "ROUTE_"
TIMEOUT = httpx.Timeout(300.0, connect=10.0)


def _normalize_model_key(model_name: str) -> str:
    return model_name.upper().replace("-", "_").replace(".", "_")


def _load_routes() -> dict[str, str]:
    routes: dict[str, str] = {}
    for key, value in os.environ.items():
        if key.startswith(ROUTE_PREFIX) and value:
            model_name = key[len(ROUTE_PREFIX) :].lower().replace("_", "-")
            routes[model_name] = value.rstrip("/")
    return routes


ROUTES = _load_routes()
API_KEY = os.environ.get("GATEWAY_API_KEY", "")


async def _check_auth(authorization: str | None) -> None:
    if not API_KEY:
        return
    expected = f"Bearer {API_KEY}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid bearer token.")


async def _proxy(method: str, target_url: str, request: Request, body: bytes | None = None) -> Response:
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length"}
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        upstream = await client.request(method, target_url, content=body, params=request.query_params, headers=headers)
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers={
            key: value
            for key, value in upstream.headers.items()
            if key.lower() not in {"content-length", "content-encoding", "transfer-encoding", "connection"}
        },
        media_type=upstream.headers.get("content-type"),
    )


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {"status": "ok", "routes": sorted(ROUTES.keys())}


@app.get("/v1/models")
async def list_models(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    await _check_auth(authorization)
    models: list[dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        for target in ROUTES.values():
            response = await client.get(f"{target}/v1/models", headers={"Authorization": authorization or ""})
            response.raise_for_status()
            payload = response.json()
            models.extend(payload.get("data", []))
    return {"object": "list", "data": models}


@app.api_route("/v1/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def route_v1(path: str, request: Request, authorization: str | None = Header(default=None)) -> Response:
    await _check_auth(authorization)
    if path == "models":
        payload = await list_models(authorization)
        return Response(content=httpx.Response(200, json=payload).text, media_type="application/json")

    body = await request.body()
    model_name: str | None = None
    if body:
        try:
            payload = await request.json()
        except Exception:
            payload = None
        if isinstance(payload, dict):
            model_name = payload.get("model")

    if not model_name:
        raise HTTPException(status_code=400, detail="Requests must include a model field for routed endpoints.")

    target = ROUTES.get(model_name) or ROUTES.get(_normalize_model_key(model_name).lower().replace("_", "-"))
    if not target:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' is not configured in the gateway.")

    return await _proxy(request.method, f"{target}/v1/{path}", request, body=body)
