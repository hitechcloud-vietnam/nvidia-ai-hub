## Summary

Describe the change clearly and concisely.

## Related Issue

Link the related issue, if any.

## Type of Change

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Documentation update
- [ ] Recipe addition or update
- [ ] Installer or runtime script change
- [ ] Breaking change

## Affected Areas

- [ ] Backend (`daemon/`)
- [ ] Frontend (`frontend/`)
- [ ] Recipe registry (`registry/recipes/`)
- [ ] Installer or runtime scripts
- [ ] Documentation

## Validation

List the checks performed:

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] backend startup with `uvicorn`
- [ ] `./check.sh`
- [ ] recipe registry load validation
- [ ] manual UI verification

Provide commands, screenshots, or notes as needed.

## Coverage and Verification Notes

- Describe what was validated for the changed area and what was intentionally not validated.
- If no automated coverage exists, summarize the manual regression checks that were performed.
- For frontend changes, mention build, lint, and UI verification status.
- For backend changes, mention startup, API, recipe loading, and platform-specific checks as applicable.
- For installer, script, or registry changes, mention the operating system, shell, and recipe/runtime smoke tests used.
- If any residual reviewer risk remains, call it out explicitly.

## Security, Licensing, and Provenance

Confirm all applicable items:

- [ ] No secrets, credentials, or internal-only data were committed
- [ ] Third-party code, assets, or recipe sources are attributed appropriately
- [ ] License implications were reviewed
- [ ] Security-sensitive changes are described below

## Breaking Changes

Describe any breaking change or write `None`.

## Documentation Impact

- [ ] No documentation update required
- [ ] README updated
- [ ] `CONTRIBUTING.md` updated
- [ ] Recipe or operational docs updated

## Screenshots or Logs

Add screenshots, terminal output, or API examples when helpful.

## Reviewer Notes

Call out anything that needs extra reviewer attention.

## PR Instructions

- Keep the pull request focused and scoped to a single concern when possible.
- Summarize the user-facing, operational, and documentation impact clearly.
- Link the related issue, request, or work item when available.
- Highlight breaking changes, security implications, licensing implications, and follow-up work explicitly.
