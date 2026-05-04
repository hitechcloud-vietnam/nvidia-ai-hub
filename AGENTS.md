# Agent Instructions

## User-Visible Hub Changes

When changing anything that affects the Spark AI Hub interface, catalog, recipes, recipe metadata, installed/running app state, Docker Compose behavior, or API-visible data, do not call the work finished until the running Hub reflects the change.

Required completion checklist:

- Restart the Hub backend when recipe/catalog/interface state may be cached or stale.
- Verify the backend responds after restart, normally with `GET http://127.0.0.1:9000/api/recipes`.
- Verify expected recipes/apps are present or removed through the API.
- Verify no unintended model/app container is occupying shared app ports such as `9001`.
- State in the final response whether the server was restarted and what was verified.

This is mandatory for Hub-facing work. The user expects to open the interface immediately after a task and see the completed changes.