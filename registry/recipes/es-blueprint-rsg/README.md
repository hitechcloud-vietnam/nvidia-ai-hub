# es-blueprint-rsg

Short reviewer/tester notes for the `Intent-Based RAN Energy Efficiency Blueprint` recipe.

## What this recipe wraps

This NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC recipe exposes the upstream VIAVI/NVIDIA notebook workflow through a lightweight Jupyter container.

Upstream sources:
- NVIDIA blueprint page: `https://build.nvidia.com/viavi/intent-driven-ran-energy-efficiency`
- Upstream repository: `https://github.com/VIAVI-CTOO/es-blueprint-rsg`

## Reviewer checklist

1. Copy `registry/recipes/es-blueprint-rsg/.env.example` to `.env` if the runtime file has not been generated yet.
2. Provide a valid `NVIDIA_API_KEY`.
3. Confirm VIAVI AI RSG access is available for the tester environment.
4. Clone the upstream repository into:
   - `registry/recipes/es-blueprint-rsg/workspace/es-blueprint-rsg`
5. Install or launch the recipe from NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC.
6. Open the notebook UI and verify Jupyter loads at `/tree/notebooks`.
7. Open `notebooks/es_blueprint_poc.ipynb` and confirm the environment is ready for sequential cell execution.

## Important prerequisites

- This is a notebook-first research blueprint, not a packaged production web app.
- VIAVI ADK access may require a private wheel served from the RSG host.
- The default recipe does not bundle private datasets, private credentials, or the upstream repo contents.

## Expected validation scope

- Recipe metadata loads in the catalog.
- Notebook label appears instead of the default web app label.
- Dedicated configuration tabs are available in the recipe detail page.
- Launch opens Jupyter successfully when the upstream workspace and credentials are present.
