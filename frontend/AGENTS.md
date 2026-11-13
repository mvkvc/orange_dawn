# Agent instructions

Solid `2.0.0-rc.3`, `@solidjs/web` `2.0.0-rc.3`, solid-pixi `3.0.0-next.0`, PixiJS `8.7.3`. These are the versions solid-pixi 3 was built against. Do not apply Solid 1 APIs, or Solid 2 APIs from a later beta or release candidate.

DOM pages use the @solidjs/web renderer. Game files named `*.pixi.tsx` compile to the solid-pixi universal renderer, not a hand-built `Application`. Styling is Tailwind 4. Solid debugging is `@solidjs/diagnostics` `2.0.0-rc.3`, turned on with `diagnostics: true` on the Vite plugin. That endpoint exists only while `vite dev` is running.

- Vite: DOM by default; `*.pixi.tsx` uses `moduleName: "solid-pixi"`, `generate: "universal"`
- TypeScript: `jsx` `preserve`, `jsxImportSource` `solid-pixi`
- Pixi display-object events use the Pixi prop name. `Sprite` uses `onclick`
- Signal writes land on the next microtask. Call `flush()` before reading a Pixi property that a setter just changed. `useTick` already flushes
- A `ref` callback is outside the owner. Do not read an async accessor inside it

Run `just frontend::check` from the repository root after frontend changes.
