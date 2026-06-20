# Releasing

Use this checklist before making the repository public.

## 1. Rights check

Confirm that you have the right to publish every file in this repository.

This matters because the upstream `shipany-template` workspace currently includes a license that says you may not publicly redistribute its source code as a standalone product. Review that source carefully before publishing any derivative work:

- upstream license reference: `/home/admin/openclaw/workspace/shipany-template/LICENSE`

If any file still depends on restricted source in a way your team is not comfortable publishing, rewrite or remove it first.

## 2. Repo metadata

- choose the public repo name
- choose the final OSS license
- update `package.json` repository fields if needed
- update the README headline, screenshots, and example provider values

## 3. Functional validation

Test all of these before tagging or announcing:

- app boots locally
- provider settings form saves and reloads
- provider settings validation blocks invalid storage config
- OpenRouter text generation works
- Replicate image generation works
- Replicate video generation works
- S3-compatible upload works
- uploaded media can be used as downstream input
- export and import still work
- `pnpm lint`, `pnpm build`, and `pnpm exec tsc --noEmit` pass

## 4. Release notes

For the first public release, describe it as `alpha` unless you have already tested across multiple providers and storage backends.
