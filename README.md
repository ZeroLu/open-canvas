# Open Canvas

`Open Canvas` is a local-first workflow canvas extracted from the direction of Cyberbara's internal canvas.

Status: `alpha`

The goal is straightforward:

- keep the canvas itself open and easy to fork
- let users bring their own API keys
- make the workflow runnable on a local machine without Cyberbara auth, credits, or database setup

## What this alpha already does

- a canvas list page plus a studio page that now runs the real `CanvasStudioShell` extracted from the main app
- note, text, image, video, and audio node types in the shared canvas graph model
- `Cyberbara`, `OpenRouter`, and `Replicate` provider support through a local BYOK settings form
- multiple local canvases backed by a JSON file on disk
- export and import as JSON
- upstream node output injected into downstream execution
- Cyberbara or storage-backed image and video uploads for canvas nodes

## Provider model

This starter keeps the provider layer intentionally simple.

- `Text` nodes can call `Cyberbara` or `OpenRouter`
- `Image` and `Video` nodes can call `Cyberbara` or `Replicate`
- uploads can use `Cyberbara` storage or `S3-compatible` storage

`Cyberbara` is the default provider for new text, image, and video nodes. Media generation and uploads use the documented `cyberbara.com/api/v1` API. Text uses the Gemini 3 Flash chat endpoint used by the main Cyberbara canvas stack.

If a specific Cyberbara key is scoped for media only and is rejected by the Gemini endpoint, switch text nodes to `OpenRouter` in the node editor.

If you choose Cyberbara for media work, one API key is enough for image generation, video generation, and uploads.

## Storage abstraction

This repo includes a storage provider interface and two upload paths:

- `Cyberbara` uploads, which reuse the same Cyberbara API key
- `S3-compatible` uploads for self-hosted or third-party object storage

- storage contracts live in `lib/storage/index.ts`
- provider bootstrapping lives in `lib/storage/manager.ts`
- the first adapter is `lib/storage/s3-compatible.ts`
- upload request parsing and validation live in `lib/uploads.ts`
- upload routes live in `app/api/uploads/images/route.ts` and `app/api/uploads/videos/route.ts`

### Supported configuration

You can save storage values in the in-app provider settings form, or set server-side defaults as environment variables:

```bash
STORAGE_PROVIDER=s3-compatible
STORAGE_S3_ENDPOINT=https://your-s3-endpoint.example.com
STORAGE_S3_REGION=auto
STORAGE_S3_ACCESS_KEY_ID=...
STORAGE_S3_SECRET_ACCESS_KEY=...
STORAGE_S3_BUCKET=open-canvas
STORAGE_S3_PUBLIC_DOMAIN=https://cdn.example.com
STORAGE_S3_PATH_PREFIX=uploads
```

This is designed to work with any S3-compatible backend, including self-hosted object storage.

## Local persistence

The app is local-first, but the persistence model is now closer to the main product shell.

- canvases and run records are stored in `data/open-canvas-db.json`
- provider settings are saved through the in-app `Providers` form and mirrored into a local cookie for server routes
- the root route `/` and `/canvas` both open the local canvas list page
- each imported JSON file creates a brand new local canvas instead of overwriting an existing one

You can create, rename, delete, and open multiple canvases from the list page or the in-studio `Canvases` dialog. Export is available from the studio page. Import is available from both the list page and the studio page.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

The first screen is the canvas list page. From there you can create a canvas or import an existing JSON export.

Inside a canvas, open the `Providers` button and save what you need:

- `Cyberbara API Key` for Cyberbara text, image, video, and upload flows
- `OpenRouter API Key` if you want text nodes to run on OpenRouter instead
- `Replicate API Token` if you want to run image or video nodes on Replicate instead
- optional `S3-compatible` storage settings if you want uploads to go to your own object storage

The form validates provider values before saving:

- invalid URLs are rejected
- `Cyberbara API Key` is required when Cyberbara uploads are enabled
- S3 endpoint, access key, secret key, and bucket are required when storage is enabled
- saved values are also written to a local cookie so the server-side execution routes can read them

If you leave storage disabled, upload buttons stay unavailable because no storage provider can accept the file.

## Model expectations

This repo does not hardcode provider catalogs yet. You supply the model string on each node.

Examples:

- text node: an OpenRouter-compatible chat model
- image node: a Cyberbara model slug such as `nano-banana-pro`, or a Replicate model slug
- video node: a Cyberbara model slug such as `seedance-1-lite`, or a Replicate model slug

For Replicate nodes, the advanced JSON box is merged into the request `input`.

For Cyberbara image and video nodes, the advanced JSON box becomes the request `options` object. The app also infers the `scene` automatically:

- `text-to-image` / `image-to-image`
- `text-to-video` / `image-to-video` / `video-to-video`

The canvas applies these rules:

- if `input.prompt` is missing, it fills it from the node prompt
- if an upstream media node exists and you did not set your own image field, it injects that media URL into a common image input field
- if a Cyberbara media node has upstream media and you did not set your own `image_input` or `video_input`, it injects those values automatically

## Known limitations in this first cut

- no auth or multi-user sync
- no auth-gated or multi-tenant hosted storage workflow
- no template gallery
- no share links
- no execution queue
- no provider-specific dynamic form generation from model schemas yet
- no model catalog yet
- Cyberbara text currently depends on the Gemini 3 Flash endpoint that the main product stack uses, not the documented public media API surface

## Extraction roadmap

### Phase 1

- local-first standalone app
- BYOK provider execution
- JSON import and export

### Phase 2

- extract current pure canvas graph logic from Cyberbara into a shared package
- move node schemas and execution descriptors into `packages/canvas-core`
- add provider adapters as separate packages

### Phase 3

- community-maintained model registry
- provider-specific settings panels
- pluggable persistence layers such as IndexedDB, SQLite, Supabase, or file-backed local mode

## Why this shape

The production Cyberbara canvas is tightly coupled to auth, cloud persistence, moderation, credit accounting, and task orchestration.

This repo takes a different stance:

- keep the real studio shell experience where possible
- replace hosted persistence with a local JSON store
- keep provider adapters replaceable
- keep user secrets local by default

## Publishing

Before you publish this repo, read [RELEASING.md](./RELEASING.md).

The short version:

- confirm you have the right to publish every file in this repo
- choose your public repo name and description
- fill provider examples in the README
- test a full flow with your own OpenRouter, Cyberbara, Replicate, and storage credentials

Contribution guidelines live in [CONTRIBUTING.md](./CONTRIBUTING.md).
