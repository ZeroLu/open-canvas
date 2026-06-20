# Open Canvas

`Open Canvas` is a local-first workflow canvas extracted from the direction of Cyberbara's internal canvas.

Status: `alpha`

The goal is straightforward:

- keep the canvas itself open and easy to fork
- let users bring their own API keys
- make the workflow runnable on a local machine without Cyberbara auth, credits, or database setup

## What this MVP already does

- local-first canvas UI built with React Flow
- note, text, image, and video nodes
- browser-local API key storage for `OpenRouter` and `Replicate`
- browser-local document persistence
- export and import as JSON
- upstream node output is injected into downstream execution
- storage-backed image and video uploads for canvas nodes

## Provider model

This starter keeps the provider layer intentionally simple.

- `Text` nodes call `OpenRouter`
- `Image` and `Video` nodes call `Replicate`

That means a community fork can add more adapters later without touching the canvas surface.

## Storage abstraction

This repo includes a storage provider interface and a first `S3-compatible` implementation that is already wired into node uploads.

- storage contracts live in `lib/storage/index.ts`
- provider bootstrapping lives in `lib/storage/manager.ts`
- the first adapter is `lib/storage/s3-compatible.ts`
- upload request parsing and validation live in `lib/uploads.ts`
- upload routes live in `app/api/uploads/images/route.ts` and `app/api/uploads/videos/route.ts`

### Supported configuration

You can either save these values in the in-app provider settings form or set them as environment variables:

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

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Then open the provider settings form in the left sidebar and save:

- `OpenRouter API Key`
- `Replicate API Token`
- optional `S3-compatible` storage settings for uploads

The form validates provider values before saving:

- invalid URLs are rejected
- S3 endpoint, access key, secret key, and bucket are required when storage is enabled
- saved values are persisted in browser local storage

If you leave storage disabled, upload buttons stay unavailable because no storage provider can accept the file.

## Model expectations

This repo does not hardcode provider catalogs yet. You supply the model string on each node.

Examples:

- text node: an OpenRouter-compatible chat model
- image node: a Replicate model slug such as a Flux-style model
- video node: a Replicate model slug for video generation

For Replicate nodes, the advanced JSON box is merged into the request `input`. This is important because many Replicate models expose different parameter names.

The canvas applies these rules:

- if `input.prompt` is missing, it fills it from the node prompt
- if an upstream media node exists and you did not set your own image field, it injects that media URL into a common image input field

## Known limitations in this first cut

- no auth or multi-user sync
- no auth-gated or multi-tenant hosted storage workflow
- no template gallery
- no share links
- no execution queue
- no provider-specific dynamic form generation from model schemas yet
- no model catalog yet

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

The current Cyberbara canvas is tightly coupled to:

- app auth
- database persistence
- moderation
- credit accounting
- Cyberbara task orchestration

That is correct for the product, but it blocks open-source adoption. This repo takes the opposite approach: keep the canvas shell thin, keep execution adapters replaceable, and keep user secrets local by default.

## Publishing

Before you publish this repo, read [RELEASING.md](./RELEASING.md).

The short version:

- confirm you have the right to publish every file in this repo
- choose your public repo name and description
- fill provider examples in the README
- test a full flow with your own OpenRouter, Replicate, and storage credentials

Contribution guidelines live in [CONTRIBUTING.md](./CONTRIBUTING.md).
