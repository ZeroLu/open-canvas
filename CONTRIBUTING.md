# Contributing

## Development

```bash
pnpm install
pnpm dev
```

Use the app locally, then run:

```bash
pnpm lint
pnpm build
pnpm exec tsc --noEmit
```

## Scope

This repository should stay focused on the open canvas itself:

- graph editing
- provider adapters
- upload and asset handling
- local-first persistence

Avoid mixing in Cyberbara-specific auth, credit accounting, billing, or internal admin logic.

## Pull requests

Please keep pull requests narrow and explain:

- what changed
- which provider or workflow it affects
- how it was validated

For provider adapters, include at least one concrete example model or request shape in the PR description.
