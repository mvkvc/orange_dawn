mod backend
mod frontend

db-start:
    docker compose up --detach --wait postgres

# Wait for the PostgreSQL process started by Overmind.
db-wait:
    #!/usr/bin/env bash
    for attempt in {1..60}; do
        if docker compose exec -T postgres pg_isready -U postgres -d orange_dawn_dev >/dev/null 2>&1; then
            exit 0
        fi
        sleep 1
    done
    echo 'PostgreSQL did not become ready within 60 seconds.' >&2
    exit 1

db-stop:
    docker compose stop postgres

db-kill:
    docker compose kill postgres

db-reset: db-start
    just backend::reset

deps:
    just frontend::deps
    just backend::deps

setup: deps db-start
    just backend::setup

build:
    just frontend::build
    just backend::build

dev:
    overmind start --no-port --stop-signals backend=TERM

test:
    just frontend::test
    just backend::test

lint:
    just frontend::lint
    just backend::lint

check:
    just frontend::check
    just backend::check

audit:
    just frontend::audit
    just backend::audit

ci workflow="":
    #!/usr/bin/env bash
    set -euo pipefail
    workflow={{quote(workflow)}}
    if [ -n "$workflow" ]; then
        act -W ".github/workflows/${workflow%.yml}.yml"
    else
        act
    fi

ci-list:
    act --list
