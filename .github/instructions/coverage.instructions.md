---
description: "Use when describing test coverage, validation coverage, regression checks, or manual verification for backend, frontend, recipe, and installer changes in NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC."
name: "Coverage Instructions"
---
# Coverage Instructions

- Prefer concrete validation evidence over generic statements such as "tested".
- For frontend changes, record whether `npm run build`, `npm run lint`, and manual UI verification were completed.
- For backend changes, record whether startup validation, API checks, recipe loading, and relevant platform-specific behavior were verified.
- For registry or recipe changes, note which recipes were loaded, updated, or smoke-tested.
- For script or installer changes, note the operating system and shell used for validation.
- If automated coverage does not exist for the touched area, state that clearly and summarize the manual checks performed.
- When a validation step was not run, explain why and identify the residual reviewer risk.
- Keep validation notes short, reviewable, and specific to the files changed.
