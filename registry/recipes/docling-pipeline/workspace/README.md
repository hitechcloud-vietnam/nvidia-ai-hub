# Docling Pipeline Workspace

This workspace stores persistent runtime data for the `docling-pipeline` recipe.

## Layout

- `inputs/<job-id>/` - uploaded source documents for one conversion batch
- `outputs/<job-id>/` - exported conversion artifacts grouped by source file stem
- `manifests/<job-id>.json` - job summary, statuses, and output paths

## Notes

- Uploaded files can contain sensitive document content. Review retention before sharing this folder.
- Delete old `inputs/` and `outputs/` job folders when disk usage grows.
- The API writes manifests even when some files fail so batch reviewers can inspect partial results.
