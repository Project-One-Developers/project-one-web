.PHONY: all up down logs db-shell

all:
	pnpm typecheck && pnpm lint && pnpm format

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

db-shell:
	docker compose exec db psql -U admin -d postgres
