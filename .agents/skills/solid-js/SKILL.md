---
name: solid-js
description: >-
  Solid 2.0.0-rc.3 for this repo. Use before writing or reviewing Solid code.
  The cheatsheet and diagnostic skill ship inside the installed solid-js
  package; read those files. Do not apply Solid 1, React, or a later Solid 2 skill.
---

# Solid

This project pins `solid-js@2.0.0-rc.3`. The package ships the agent material. Read it from the install.

Before writing Solid code, read `frontend/node_modules/solid-js/CHEATSHEET.md`.

When a Solid diagnostic code appears, read `frontend/node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md`.

When capturing why a scope re-ran, read `frontend/node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md`.

JSX compiles with `jsxImportSource` `solid-pixi`, not `@solidjs/web`. Pixi object APIs are the `pixijs` skill.
