# Agent instructions

Use short-lived branches and pull requests into `main`. Do not commit directly
to `main`. Commit locally to start. Do not push or open a remote pull request unless directed.

## Commits

Conventional Commits title only. No body.

```
feat: add lobby channel join
fix: return json for unknown api routes
```

Use `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `build`. Keep the title within 72 characters.

## Layout

`frontend/` is the client. `backend/` is the API and channels server. Root `just` recipes run both. `just dev` starts Postgres, then Vite and Phoenix together. Local ports and URLs come from the root `.env`, which direnv loads.

Framework rules stay with the code they cover:

- Backend Elixir, Phoenix, and Ecto rules: `backend/AGENTS.md`
- Frontend Solid and solid-pixi rules: `frontend/AGENTS.md`
