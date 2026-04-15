# Registry Expansion Roadmap

## Goal
Add at least 100 new registry entries across all major catalog groups with matching categories, family banners, and reviewed metadata.

## Delivery mode
- Strategy: plan first, then implement in batches.
- Quality bar: fully researched entries only.
- Scope: vLLM / NVIDIA official, multi-modal apps, image/video/3D, Ollama/local runtimes.

## Proposed new catalog categories
These should be added as batches land so the catalog stays navigable:
- `chat-ui` — chat-first web apps and assistants
- `rag` — retrieval and knowledge assistants
- `speech` — TTS, ASR, voice cloning, audio agents
- `vision-language` — VLM and document/image understanding
- `code-gen` — coding and agentic coding models/apps
- `reasoning` — reasoning-focused models
- `image-edit` — image edit and inpainting apps
- `image-understanding` — OCR, document AI, captioning, grounding
- `video-tools` — video editing, captioning, generation, avatar tools
- `3d-tools` — 3D reconstruction, generation, mesh workflows
- `runtime` — model serving runtimes and API gateways
- `workflow` — orchestration, pipelines, agent builders

## Proposed banner families
Create or reuse family banners as entries are added:
- `llama-aurora-lattice.svg`
- `qwen-vision-atlas.svg`
- `gemma-spectrum-grid.svg`
- `phi-prism-arc.svg`
- `nemotron-nebula-core.svg`
- `gptoss-forge-grid.svg`
- `seed-crystal-mesh.svg`
- `mistral-monsoon-flow.svg`
- `deepseek-orbit-matrix.svg`
- `glm-signal-weave.svg`
- `internvl-canvas-array.svg`
- `granite-foundry-stack.svg`
- `smollm-pocket-pulse.svg`
- `rag-knowledge-weave.svg`
- `speech-wave-studio.svg`
- `video-motion-ribbon.svg`
- `3d-holo-mesh.svg`
- `runtime-control-plane.svg`

## Batch plan

### Batch 1 — vLLM foundation families (20)
1. Llama 3.2 1B Instruct
2. Llama 3.2 3B Instruct
3. Llama 3.1 70B Instruct FP8
4. Llama 3.3 70B Instruct
5. Mistral 7B Instruct v0.3
6. Mixtral 8x7B Instruct
7. Mixtral 8x22B Instruct
8. Ministral 8B Instruct
9. DeepSeek R1 Distill Qwen 7B
10. DeepSeek R1 Distill Llama 8B
11. DeepSeek V2 Lite Chat (official lightweight DeepSeek substitute; no public DeepSeek V3 Lite release)
12. GLM 4.5 Air
13. GLM 4.5
14. Granite 3.1 8B Instruct
15. Granite 3.1 2B Instruct
16. SmolLM3 3B Instruct
17. Aya Expanse 8B
18. Aya Expanse 32B
19. Command R7B
20. Command R+

### Batch 2 — vLLM multimodal families (20)
1. Qwen2.5 VL 3B Instruct
2. Qwen2.5 VL 7B Instruct
3. Qwen2.5 VL 32B Instruct
4. Llama 3.2 11B Vision
5. Llama 3.2 90B Vision
6. InternVL 2.5 4B
7. InternVL 2.5 8B
8. InternVL 2.5 26B
9. Phi 3.5 Vision Instruct
10. Phi 4 Multimodal base variant
11. MiniCPM V 4
12. MiniCPM-o 2.6 variant
13. Molmo 7B O
14. Molmo 72B
15. VLM-R1 7B
16. VLM-R1 32B
17. OCRFlux Doc VLM
18. Florence 2 Large API
19. Kosmos 2.5 Instruct
20. Pixtral Large

### Batch 3 — image / video / 3D apps (20)
1. InvokeAI
2. Fooocus
3. Stable Diffusion WebUI Forge
4. SwarmUI
5. Kohya SS
6. ComfyUI Manager preset pack
7. FramePack
8. CogVideoX Studio
9. Mochi 1 Preview app
10. Hunyuan Video
11. Wan 2.1 app
12. InstantMesh
13. TripoSR
14. Wonder3D
15. Meshy workflow bridge
16. ImageBind demo app
17. Segment Anything Studio
18. Grounded SAM workstation
19. OCR + captioning studio
20. Diffusers playground

### Batch 4 — speech / audio / agent apps (15)
1. Open WebUI Pipelines
2. LibreChat
3. OpenHands
4. STT server (Whisper/FastAPI)
5. WhisperX workstation
6. Parler TTS Studio
7. F5 TTS app
8. CosyVoice Studio
9. MeloTTS Studio
10. VoiceCraft lab
11. RVC voice conversion
12. Live transcription hub
13. Audio agent console
14. Browser-use workstation
15. AgentOps starter

### Batch 5 — RAG / workflow / enterprise apps (15)
1. Dify
2. Ragflow
3. OpenWebUI RAG preset
4. LlamaIndex starter
5. Haystack studio
6. GraphRAG workstation
7. Docling pipeline
8. AnythingLLM enterprise preset
9. Flowise RAG preset
10. Langflow RAG preset
11. OpenSearch AI assistant
12. Milvus assistant stack
13. Qdrant assistant stack
14. Neo4j knowledge graph agent
15. Jupyter AI lab

### Batch 6 — local runtimes / gateways (16)
1. Ollama base runtime presets
2. llama.cpp server
3. SGLang runtime
4. TensorRT-LLM API gateway
5. TGI runtime
6. Aphrodite engine
7. LM Studio bridge
8. Jan runtime bridge
9. VLLM multi-model gateway
10. LiteLLM proxy
11. OpenRouter-compatible proxy
12. FastChat runtime
13. Text Embeddings Inference
14. Infinity embeddings runtime
15. rerank server
16. OmniRoute is an AI gateway for multi-provider LLMs: an OpenAI-compatible endpoint with smart routing, load balancing, retries, and fallbacks. Add policies, rate limits, caching, and observability for reliable, cost-aware inference.

## Total planned additions
- 106 candidate registry entries.

## Suggested implementation order
1. Batch 1: strengthen current vLLM catalog depth.
2. Batch 2: expand multi-modal coverage and dedicated VLM banners.
3. Batch 3: broaden creative pipeline categories.
4. Batch 4: complete speech and agent surfaces.
5. Batch 5: add enterprise knowledge and workflow stacks.
6. Batch 6: round out runtime and gateway ecosystem.

## Reviewer risks
- Fully researched 100+ entries will require staged source validation per family.
- Some models may be TensorRT-LLM-first or Ollama-first rather than vLLM-first; runtime fit must be confirmed per recipe.
- Catalog UX should not expose too many categories at once without grouping or search improvements.
- Banner creation should stay family-level, not one-off per individual model, to keep assets maintainable.

## Next implementation slice
Recommended next slice: Batch 1 only, with 15 to 20 vLLM families plus the required category and banner updates.
