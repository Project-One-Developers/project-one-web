.PHONY: all up down logs db-shell

all:
	pnpm typecheck && pnpm lint:fix && pnpm format

up:
	docker compose up --remove-orphans -d

down:
	docker compose down

logs:
	docker compose logs -f

db-shell:
	docker compose exec db psql -U admin -d postgres
