# orange_dawn

An online multiplayer turn-based strategy game inspired by Advance Wars on the
Game Boy Advance.

## Local setup

Install Nix with flakes enabled, direnv with Nix integration (`use flake`), and
Docker with Compose. Enable direnv's shell hook and start the Docker daemon.
Docker and direnv are host prerequisites; the Nix shell supplies Node, pnpm,
Elixir/Erlang, and just.

From the repository root:

```sh
direnv allow
just setup
just dev
```

`just setup` installs dependencies, starts PostgreSQL, creates the development
database, and runs migrations and seeds. `just dev` runs PostgreSQL, Vite, and Phoenix through Overmind, opening the game
in your default browser. Phoenix waits for PostgreSQL and runs inside IEx.
Use `overmind connect backend` from another terminal to interact with IEx;
Ctrl-B then D detaches without stopping it. Ctrl-C in the main Overmind terminal
stops all three processes, preserving database data.

Open <http://localhost:5173>. Vite proxies `/api` and `/socket` to Phoenix at
<http://127.0.0.1:4000>. API routes belong under `/api/v1`; WebSockets use
`/socket`, with lobby topics named `lobby:<id>`.

The root `.env` contains local development defaults, loaded by direnv. Keep
real credentials out of this tracked file. PostgreSQL binds host port 5432 in
`compose.yaml`; changing the database URL does not change Docker's port mapping.

Stop application processes with Ctrl-C. `just db-stop` stops PostgreSQL while
preserving its named data volume.

## Commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `just deps` | Install frontend and backend dependencies |
| `just setup` | Install dependencies and initialize the database |
| `just dev` | Start the development stack |
| `just build` | Build frontend assets and compile the backend |
| `just db-stop` | Stop PostgreSQL without deleting its volume |

Frontend builds write to `backend/priv/static`. Production configuration enables
Phoenix's SPA fallback. `just build` uses the current Mix environment; it does
not create or deploy a production release. GitHub Actions runs the same checks on pull requests and pushes to `main`.

## Authentication

Authentication uses Phoenix 1.8's generated email-link flow, adapted to JSON
following [Phoenix's API guide](https://phoenix.hexdocs.pm/api_authentication.html).
The DaisyUI site shell has a navbar and theme picker. The home page is empty.
Login is at `/users/log-in`, registration is at `/users/register`, and authenticated
users see a Log out button in the navbar. Solid Router `2.0.0-next.18` owns
client navigation and the not-found route; it is pinned for compatibility with
Solid `2.0.0-rc.3`. DOM pages compile with `@solidjs/web`; `*.pixi.tsx` files
use the Pixi renderer. Router integration tests run in jsdom.

Register with `POST /api/v1/users` or request a sign-in link with
`POST /api/v1/session`, using `{"user":{"email":"player@example.com"}}`.
Open development emails at `http://localhost:4000/dev/mailbox`.
Links expire after 15 minutes. The client exchanges the email token via
`POST /api/v1/session` with `{"user":{"token":"..."}}` for `{user, csrf_token}`.
The first login confirms the email and clears earlier tokens; links are single-use.

Browser authentication follows Phoenix's session pattern: an HttpOnly signed
session cookie and a persistent, signed remember-me cookie lasting 14 days.
Active sessions are reissued after seven days. Production cookies are Secure
and SameSite=Lax. No authentication token is returned to JavaScript or stored in
sessionStorage/localStorage. `GET /api/v1/session` returns the current user (or
null) and a CSRF token; state-changing requests send it as `x-csrf-token`.
Logout revokes the database session and clears both cookies. Socket connections
use Phoenix session connect-info and require the `_csrf_token` connection parameter.

Development uses Swoosh's local mailbox; tests use its test adapter. Production
requires `FRONTEND_URL` (the public HTTPS client origin), `MAIL_FROM`, `SMTP_HOST`,
`SMTP_USERNAME`, and `SMTP_PASSWORD`; `SMTP_PORT` defaults to 587. SMTP uses
STARTTLS with certificate verification. Real SMTP delivery requires deployment
credentials and has not been exercised locally.

## Repository and agent workflow

- `frontend/`: client code and renderer configuration.
- `backend/`: API, channels, database configuration, and static asset serving.
- `.agents/skills/`: repository-maintained Solid and Pixi guidance tied to the
  pinned packages. Install frontend dependencies before reading their package
  references.
- `AGENTS.md`, `frontend/AGENTS.md`, and `backend/AGENTS.md`: contribution and
  framework-specific instructions.

Use short-lived branches and pull requests into `main`. Agents commit locally;
pushing and opening remote PRs require an explicit request. Keep the pinned
Solid/solid-pixi/Pixi versions aligned when changing dependencies.

## Checks and tests

`just check` runs lint, builds (including typechecking), and tests for both projects. `just lint`,
`just build`, and `just test` run each category.
Root test/check commands start PostgreSQL. For one project, use
`just frontend::check` or `just backend::check` (or `test`, `lint`, `build`).
Backend test commands also start PostgreSQL automatically.

Frontend lint uses ESLint's strict type-aware TypeScript rules with zero warnings,
plus Prettier formatting checks.
TypeScript runs in strict mode. Vitest discovers `test/**/*.test.ts` under `frontend/` in Node;
the initial empty frontend suite is explicitly allowed until game logic lands.
It does not validate browser rendering. Backend checks enforce formatting and
compiler warnings as errors, Credo (`--strict`), and Sobelow (all confidence
levels), then run the existing Phoenix-generated ExUnit tests. The SPA fixed-file
response has a documented, function-scoped traversal false-positive suppression.
Frontend builds run `tsc --noEmit` before Vite. Backend builds run
`mix compile --warnings-as-errors`; no separate Dialyzer analysis is configured.

Checks do not rewrite files. To apply formatting fixes, run `pnpm format` inside `frontend/` or `mix format` inside `backend/`.

The workflows are `.github/workflows/frontend_check.yml` and
`.github/workflows/backend_check.yml`, with `frontend_check` and `backend_check`
jobs respectively. CI uses standard Node/pnpm and Erlang/Elixir setup actions and invokes each
tool directly; Nix is only used for local development. Backend CI provides PostgreSQL 18 as a service;
`mix test` creates the test database if needed and runs migrations via its alias.

`actionlint.yml` validates all GitHub Actions workflows. `danger.yml`
enforces Conventional Commit PR titles and commit messages: the types listed in
`AGENTS.md`, optional scope/breaking marker, at most 72 characters, and no commit
body. The root Ruby `Dangerfile` runs in the official Danger container image.
Danger uses dry-run mode to fail CI without posting comments or statuses;
PR metadata comes from the event payload, so no API token is needed. Configure these jobs as required status checks in GitHub branch
protection to prevent merging failing PRs.

Dependency security checks run in both project checks and CI. Run `just audit`
for both, or `just frontend::audit` / `just backend::audit` individually.
`pnpm audit --audit-level low` checks production and development dependencies
and fails on low-or-higher advisories. `mix hex.audit` checks locked Hex packages
for vulnerabilities and retirements (requires Hex 2.5 or newer; update with
`mix local.hex --force`). Audits require network access and do not automatically
change dependency versions or suppress findings.

## Local CI with act

The Nix dev shell includes `act`. Reload direnv after shell changes.
With Docker running, use `just ci-list` to list jobs, `just ci` to run `act`,
or `just ci frontend_check` to run `act -W .github/workflows/frontend_check.yml`.
The `.yml` suffix is optional. You can also run `act` directly with any flags.
The first run downloads the configured Ubuntu runner image. Stop the local
Postgres container with `just db-stop` before backend CI so port 5432 is free.
Act's runner accesses its PostgreSQL service by container name; `.actrc` sets
`BACKEND_TEST_DATABASE_HOST=postgres` for that environment. Normal local tests
and GitHub runners use localhost.

Act also runs the Danger container; no local Ruby installation is required.
Local act runs help catch workflow issues, but GitHub remains the final check for hosted-runner
behavior and permissions. Dependency audits currently fail for known frontend
advisories; local CI preserves those failures.
