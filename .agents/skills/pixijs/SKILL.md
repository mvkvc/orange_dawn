---
name: pixijs
description: >-
  PixiJS 8.7.3 for this repository. Use before writing or reviewing Pixi
  rendering, assets, input, animation, or lifecycle code. Resolve APIs against
  the installed package, not current PixiJS v8 documentation.
---

# PixiJS 8.7.3

This repository-maintained skill targets the exact version in
`frontend/package.json` and `frontend/pnpm-lock.yaml`. Do not upgrade Pixi or
replace this skill with the latest upstream reference to resolve an API mismatch.

## Source of truth

Before using an API, read its declaration and relevant implementation in
`frontend/node_modules/pixi.js/lib/`. Adjacent `.d.ts` and `.mjs` files come from
the pinned package. Check its `package.json` reports `8.7.3`. If dependencies
are missing, run `just frontend::deps` from the repository root in the dev
environment. Resolve installation mismatches before relying on those files.

Paths below are relative to `frontend/node_modules/pixi.js/lib/`:

| Task | Read |
| --- | --- |
| Application and resize | `app/Application.d.ts`, `app/ResizePlugin.d.ts` |
| Transforms and teardown | `scene/container/Container.d.ts` |
| Sprites and textures | `scene/sprite/Sprite.d.ts`, `rendering/renderers/shared/texture/Texture.d.ts` |
| Graphics and gradients | `scene/graphics/shared/Graphics.d.ts`, `scene/graphics/shared/fill/FillGradient.d.ts` |
| Assets | `assets/Assets.d.ts` |
| Animation timing | `ticker/Ticker.d.ts` |
| Input | `events/FederatedEventTarget.d.ts`, `events/FederatedPointerEvent.d.ts` |
| Filters | `filters/Filter.d.ts` |

For other APIs, locate the symbol in this installed package. A “v8” reference
is not necessarily compatible with 8.7.3. For example, gradients use positional
coordinates, not the newer options object:

```ts
import { FillGradient } from "pixi.js";

const gradient = new FillGradient(0, 0, 200, 0);
gradient.addColorStop(0, 0xff0000);
gradient.addColorStop(1, 0x0000ff);
```

## Solid integration

Read `frontend/AGENTS.md` and the `solid-js` skill for Solid components. Keep
application ownership with solid-pixi's universal renderer; do not introduce
a second hand-built Pixi Application.

For JSX props, events, hooks, and disposal, inspect the pinned wrapper's
`frontend/node_modules/solid-pixi/src/` and `types/`, particularly
`Application.tsx`, `hooks.tsx`, `runtime.tsx`, and `interfaces.ts`. Raw Pixi
examples do not establish wrapper reactivity or lifecycle behavior.

After code changes, run `just frontend::build` (TypeScript checks and Vite build).
For rendering, input, or lifecycle changes, exercise the affected browser
behavior too; compilation alone does not verify it.
