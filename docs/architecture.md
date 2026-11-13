# Play architecture: humans, browser agents, and headless RL

This document describes how every kind of participant reaches a game. It is the
plan for the layers that sit around the game rules, written before the game
`GenServer`s and rules exist, so that all three audiences share one engine
instead of growing three parallel implementations.

## Audiences

| Audience | What they do | Surface |
| --- | --- | --- |
| Humans on the web | Play from a PC or mobile browser | Solid UI over Phoenix channels |
| Local agents and their humans | Run an agent next to a watching human | Scripted browser (JS facade over CDP) |
| RL training | Self-play and live matchmaking at scale | Headless agent endpoint, or in-process env |

## Core principle: one rules core, three hosts

The game is a pure library. Everything else is an adapter.

```
                     ┌──────────────────────────────┐
 browser  ──channel─►│                              │
 agent CLI ─channel─►│  Match (OTP GenServer)       │──► Postgres event log
 spectator ─channel─►│  seats, clocks, PubSub       │
                     └──────────────┬───────────────┘
                                    │ same pure core
 RL trainer ──stdio/gRPC────────────┴──► Game.Env (no DB, no socket, no per-step process)
```

`OrangeDawn.Game.Rules.apply(state, action) :: {:ok, state, [event]} | {:error, reason}`
is the whole game. No channel handler, `GenServer` callback, or client SDK
contains game logic. Clients submit intents; the server validates them and is
authoritative. This single decision is what makes the three audiences cheap.

The browser facade is an **adapter, not the contract**. The canonical protocol
is defined server-side; the facade and the headless endpoint are two clients of
it. That is what stops them from drifting apart.

## Identity: accounts are not seats

Humans authenticate with the existing email-link flow and session cookies.
Other actors need other credentials, all resolving to the same
`OrangeDawn.Accounts.Scope`:

| Actor | Credential | Transport |
| --- | --- | --- |
| Human | Email magic link, session cookie | `/socket` (existing) |
| Guest | Device cookie, guest user row | `/socket` |
| Agent | Bearer API token or match join code | `/socket` token connect, or headless endpoint |
| RL trainer | Ephemeral training token, or none | stdio/gRPC to `Game.Env` |
| Spectator | Session or guest cookie | `/socket`, read-only join |

Schema changes, made while auth is still small:

- `users.email` becomes nullable; add `kind` (`:human | :guest`). Postgres
  unique indexes allow many NULLs. Registering attaches an email to the same
  row so a guest's match history survives the upgrade.
- New `api_clients` (non-human actors): `user_id` nullable owner, `name`,
  `kind` (`:agent | :trainer`), `revoked_at`.
- New `api_tokens`: hashed, shown once, with scopes.
- New `join_codes`: `code, match_id, seat, expires_at, single_use`. A human
  creates a match in the browser and hands the code to a local agent; no
  account is needed for the bot.

Agent auth rules:

- Issue a short-lived **socket ticket** (`Phoenix.Token`) instead of putting a
  long-lived token in a WebSocket URL; URLs end up in logs.
- `UserSocket.connect/3` grows a second clause: session cookie for humans and
  guests, `token` connect param for agents. The `_csrf_token` requirement
  applies only to cookie connections; bearer clients have no cookie and no
  CSRF risk.
- Seat joins verify seat ownership. The lobby channel accepting any topic
  today is fine for a stub and is the one place auth bugs become game-integrity
  bugs once seats exist.

A browser-driven agent uses the human's session. That is a feature (no extra
auth) and a hazard (the server cannot tell bot from human), so every action is
tagged with `source: "agent" | "human"` and matches containing a scripted actor
are marked `assisted: true` so ratings stay honest.

## Protocol: intents in, versioned events out

Four consumers share one vocabulary: channels, the RL env, replays, and tests.

```elixir
%Action{type: :move | :attack | :end_turn, payload: map}
%Event{seq: 1, type: :unit_moved, payload: map}
%Snapshot{seq: 41, state: map}
```

- Clients send **intents**, never state.
- The server broadcasts **events plus a snapshot version**; no full-state spam
  per action.
- `match:join` takes `last_seen_seq` and replays the gap, falling back to a
  snapshot. Backgrounding a mobile tab and reconnecting is normal, not
  exceptional.
- Every action carries an **idempotency key**. Agents retry; without keys a
  retried end-turn corrupts the match.
- The **event log is the source of truth** in Postgres. The match process is a
  cache. One table buys reconnect, replay, spectating, RL episode export, and
  deploy safety.

## Match hosting

One `OrangeDawn.Game.Match` GenServer per active match under a
`DynamicSupervisor`, registered in a `Registry`. Started lazily on first join
or action; stopped when idle and reloaded from the event log. It owns turn
clocks, seat presence, and PubSub. It owns no rules.

```elixir
match_seats: match_id, seat, controller, user_id, api_client_id, claimed_at
controller: :human | :guest | :agent | :bot | :env
```

The `controller` field is the whole trick: a seat is a slot, and who fills it
is configuration. `:human` and `:guest` are driven by channel messages, `:agent`
by a connected agent client, `:bot` by an in-server heuristic module, `:env` by
training. Seat disconnect policy is explicit from day one: turn clock plus
auto-pass or pause, with agent reconnect grace. A crashed agent must never
wedge a match.

Spectators are read-only joins to the same `match:<id>` topic and need no seat
row. Because the browser facade and the headless endpoint consume the same
event stream, spectating is one implementation for all audiences.

## Browser surface for agents

Expose a narrow, versioned, promise-based facade; never raw DOM selectors and
never `fetch` access:

```ts
window.orangeDawn = {
  version: 1,
  ready: Promise<void>,

  // read
  listMatches(opts?): Promise<MatchSummary[]>;
  getObservation(opts?: { since?: number }): Promise<Observation>;
  legalActions(): Promise<Action[]>;
  subscribe(cb: (event: Event) => void): () => void;

  // write
  joinMatch(id: string, opts: { seat?: number; as?: "player" | "spectator" }): Promise<void>;
  submitAction(action: Action, opts?: { idempotencyKey?: string }): Promise<void>;
  leaveMatch(): Promise<void>;
};
```

Why a facade:

- **Deterministic.** Selectors break on restyles; the facade is the contract
  and CDP is just transport.
- **Cheap for the good case.** One `submitAction` instead of fifteen synthetic
  mouse events.
- **Testable.** Component and Playwright tests call the same facade.
- **Safe.** It routes through the app's existing request helper, so CSRF stays
  internal. The CSRF token and session cookie are never exposed to JavaScript;
  the facade is match-scoped and exposes no account mutation.

For computer-use agents that only speak pixels and selectors, add semantic DOM
affordances (`data-od-unit`, `data-od-owner`, `data-od-action`,
`data-od-legal`). They are cheap, they make raw CDP agents viable without a
supported selector API, and they help testing.

Shared-browser policy: an agent driving the same browser instance as the human
locks the human out mid-turn. The default shape is a **headless agent** with
its own browser or process while the human watches via a spectator link;
co-driving one browser is supported but not the default. The facade must
survive a page refresh: `ready` resolves after session restore and
`getObservation({since})` resumes from the last seen seq.

CDP is a **support boundary**: the facade and the `data-od-*` attributes are
supported; arbitrary Playwright scripts are not part of the compatibility
matrix.

## Headless agent endpoint

A first-class protocol, not "another channel":

```
POST /api/v1/agent/matches                → create or join a training/agent match
GET  /api/v1/agent/matches/:id/observation?since=41
POST /api/v1/agent/matches/:id/actions    { idempotency_key, action }
ws   /api/v1/agent/lobby                  → queue, match assignment, push
```

- **Auth:** bearer token or ephemeral training token; no magic link, no
  cookie. Short-lived socket tickets for the WebSocket path.
- **Matchmaking is a feature:** `{ mode: "agent" | "training", rating?, pool?,
  ruleset? }`. Training pools are isolated from public ratings and from the
  public lobby's capacity.
- **Two client shapes:** turn-based request/response for simple clients and a
  persistent WebSocket for low latency; the client picks.
- **Isolation:** a separate release or port, concurrency caps, rate limits,
  and backpressure. A self-play fleet must never starve the lobby.
- **Offline training does not go through the server.** Throughput lives in
  `OrangeDawn.Game.Env` (below); this endpoint is for finding real opponents
  and live matches.

## RL environment

Training is never a channel client. Per-step WebSocket round trips, one
GenServer per env, and a DB write per action would cap throughput at a tiny
fraction of what the BEAM can do.

- `OrangeDawn.Game.Env` is pure and deterministic given a seed: `reset/1`,
  `step/2`, `observation/1`, `legal_actions/1`. No process, no Repo, no PubSub.
- A **stdio JSON-lines bridge** (`orangectl env --stdio`) serves the
  Python/PettingZoo side: crash-isolated and trivial to wrap. Move to gRPC
  only if outgrown. No NIF for the rules engine: same speed argument, much
  worse failure mode.
- A separate `:training` config/release boots without Postgres, mail, or SMTP.
- "Watch the AI play" is an optional broadcast sink that mirrors a chosen
  episode into the match server as a spectate-only, tick-paced match, so
  training stays decoupled from the online server while spectating reuses the
  existing channel.

## Build order

1. `Game.Rules` pure core plus the `Action`/`Event`/`Snapshot` schema, with a
   trivial rule set. No GenServer yet.
2. `Match` supervisor, event log, lazy reload, and the `match:<id>` channel
   with seat vs spectator roles and `last_seen_seq` resume.
3. Principal and scope extension: guest users, nullable email, `api_clients`
   and tokens, agent socket connect, join codes.
4. The canonical client SDK: one TypeScript module used by the UI, the facade,
   and a Node headless client. This is the piece that keeps the two agent
   surfaces from drifting.
5. `window.orangeDawn` facade plus `data-od-*` attributes, proven by a
   Playwright test that plays a full game through it.
6. The agent endpoint, queue, and ephemeral auth, proven by a
   random-vs-random headless client.
7. `Game.Env` and the stdio bridge, proven by one fully headless self-play
   match.
8. The real game rules and Pixi rendering.

By step 7 all three audiences have been exercised against the same engine
before a single real unit exists.

## Pitfalls

- Rules in `GenServer` callbacks or channel handlers: RL needs a rewrite later.
- Identifying players by socket id: spectators, reconnects, and agents all break.
- Broadcasting full state on every action: mobile bandwidth and replay drift.
- Giving agents human magic-link auth: token lifecycle pain and abuse.
- Essential match state living only in the match process: a deploy loses games.
- Training and online play in one OS process: a runaway self-play job starves
  the lobby.
- The browser facade becoming the contract: two protocols that drift, and an
  attack surface that grows with every exposed function.
