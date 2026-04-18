# Frontend Workspace

This directory contains the React + Vite frontend for `NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC`.

`NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC` is a software solution developed and distributed by **Pho Tue SoftWare And Technology Solutions Joint Stock Company**.

## Trademark and legal notice

`NVIDIA`, the `NVIDIA` logo, `DGX`, `CUDA`, and related NVIDIA names are trademarks and/or registered trademarks of **NVIDIA Corporation** and its affiliates in the United States and other countries.

References to NVIDIA platforms, drivers, GPU runtimes, or ecosystem technologies in this frontend are descriptive only and do not imply sponsorship, endorsement, certification, or affiliation unless expressly stated in writing.

All other trademarks, logos, product names, and company names shown in the interface or documentation remain the property of their respective owners.

## Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Create a desktop development build and launch Electron:

```bash
npm run desktop:dev
```

Create packaged desktop artifacts:

```bash
npm run desktop:dist
```

Run lint checks:

```bash
npm run lint
```

## Desktop packaging notes

- Electron sources live in `electron/`
- the packaged desktop app starts a local FastAPI backend runtime
- desktop packaging expects Python to be available on the build machine
- hosted CI packaging is staged in `.github/workflows/desktop-build-disabled.yml`
- app icons are generated from `public/brand/spark-ai-hub-mark.svg` via `npm run build:icons`
- `npm install` now repairs a broken Electron binary install automatically via `npm run electron:ensure`
- Windows signing can use `CSC_LINK` and `CSC_KEY_PASSWORD`
- macOS signing additionally expects `CSC_NAME`
- macOS notarization expects `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`
- if `electron-builder` fails while downloading Electron with an HTTP `504`, retry the build because that failure is usually upstream network availability rather than project config

For full repository-level setup, validation, and licensing guidance, see:

- [`../README.md`](../README.md)
- [`../docs/local-development.md`](../docs/local-development.md)
- [`../docs/licensing.md`](../docs/licensing.md)
