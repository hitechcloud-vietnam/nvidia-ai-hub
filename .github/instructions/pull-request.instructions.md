---
description: "Use when preparing pull requests, updating the PR template, or documenting reviewer guidance, validation scope, risks, and rollout notes for spark-ai-hub changes."
name: "Pull Request Instructions"
---
# Pull Request Instructions

- Keep each pull request scoped to one concern when possible.
- Summarize the user-facing and operational impact in plain language.
- Link the related issue, recipe request, or internal work item when one exists.
- Call out affected areas explicitly: backend, frontend, registry, scripts, governance docs, or licensing.
- Document risks clearly, especially for security, licensing, installer behavior, Docker runtime behavior, or breaking changes.
- If commands, ports, environment variables, or prerequisites changed, update the relevant docs in the same pull request.
- Include evidence for validation claims: command output, screenshots, or short reviewer notes.
- Flag any follow-up work that is intentionally deferred.
