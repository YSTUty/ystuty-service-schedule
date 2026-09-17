project_name ?= ystuty-service-schedule
service_name ?= app_srv

base_yml := docker-compose.yml
prod_yml := docker-compose.prod.yml
db_yml := docker-compose.db.yml
deploy_yml := docker-compose.deploy.yml

dc := docker compose -p "$(project_name)"

# Docker Compose reads IMAGE_NAME and IMAGE_TAG from .env by default. Only
# command-line Make variables are forwarded explicitly to override .env.
image_env = $(if $(filter command line,$(origin IMAGE_NAME)),IMAGE_NAME="$(IMAGE_NAME)") $(if $(filter command line,$(origin IMAGE_TAG)),IMAGE_TAG="$(IMAGE_TAG)")

# files_base := -f $(base_yml) -f $(db_yml)
# files_prod := -f $(base_yml) -f $(prod_yml) -f $(db_yml)
files_base := -f $(base_yml)
files_prod := -f $(base_yml) -f $(prod_yml)
files_db := -f $(base_yml) -f $(db_yml)
files_prod_db := -f $(base_yml) -f $(prod_yml) -f $(db_yml)
files_deploy := -f $(deploy_yml)
files_deploy_db := -f $(deploy_yml) -f $(db_yml)

db_services := redis

# networks := ystuty-network
networks := ystuty-network ystuty-service-network

.DEFAULT_GOAL := help

.PHONY: help ps ps-running logs down stop restart pull \
	up-dev up-dev-build up-prod up-prod-build \
	up-db up-db-build \
	up-dev-with-db up-dev-with-db-build \
	up-prod-with-db up-prod-with-db-build \
	pull-image deploy deploy-with-db \
  ensure-networks

help:
	@printf '%s\n' \
	'Targets:' \
	'  up-dev                 Start app (dev)' \
	'  up-dev-build           Build and start app (dev)' \
	'  up-prod                Start app (prod)' \
	'  up-prod-build          Build and start app (prod)' \
	'  up-db                  Start Redis only' \
	'  up-db-build            Build (if any) and start Redis only' \
	'  up-dev-with-db         Start db then app (dev)' \
	'  up-dev-with-db-build   Start db then build+app (dev)' \
	'  up-prod-with-db        Start db then app (prod)' \
	'  up-prod-with-db-build  Start db then build+app (prod)' \
	'  pull-image             Pull selected GHCR image without restarting app' \
	'  deploy                 Pull and start GHCR image with external MSSQL/Redis' \
	'  deploy-with-db         Start local Redis, then deploy GHCR image' \
	'  ps                     Show containers' \
	'  ps-running             Show running containers' \
	'  logs                   Follow logs (all)' \
	'  down                   Stop and remove stack' \
	'' \
	'Vars:' \
	'  project_name=..., service_name=..., IMAGE_NAME=..., IMAGE_TAG=...'

ensure-networks:
	@set -e; \
	for n in $(networks); do \
		docker network inspect $$n >/dev/null 2>&1 || docker network create $$n >/dev/null; \
	done

ensure-networks-log:
	@for n in $(networks); do \
			if ! docker network inspect "$$n" >/dev/null 2>&1; then \
					echo "Creating network $$n..."; \
					docker network create "$$n"; \
			else \
					echo "Network $$n already exists"; \
			fi \
	done

ps:
	@$(dc) ps

ps-running:
	@$(dc) ps --status running

logs:
	@$(dc) logs -f --tail=200

pull:
	@$(dc) $(files_base) pull

stop:
	@$(dc) stop

restart:
	@$(dc) restart

down:
	@$(dc) $(files_prod_db) down

up-dev: ensure-networks
	@$(dc) $(files_base) up -d $(service_name)

up-dev-build: ensure-networks
	@$(dc) $(files_base) up -d --build $(service_name)

up-prod: ensure-networks
	@$(dc) $(files_prod) up -d $(service_name)

up-prod-build: ensure-networks
	@$(dc) $(files_prod) up -d --build $(service_name)

up-db: ensure-networks
	@$(dc) $(files_db) up -d $(db_services)

up-db-build: ensure-networks
	@$(dc) $(files_db) up -d --build $(db_services)

up-dev-with-db: up-db
	@$(dc) $(files_base) up -d $(service_name)

up-dev-with-db-build: up-db
	@$(dc) $(files_base) up -d --build $(service_name)

up-prod-with-db: up-db
	@$(dc) $(files_prod) up -d $(service_name)

up-prod-with-db-build: up-db
	@$(dc) $(files_prod) up -d --build $(service_name)

pull-image:
	@$(image_env) $(dc) $(files_deploy) pull $(service_name)

deploy: ensure-networks pull-image
	@$(image_env) $(dc) $(files_deploy) up -d --no-deps --force-recreate $(service_name)

deploy-with-db: ensure-networks
	@$(image_env) $(dc) $(files_deploy_db) up -d $(db_services)
	@$(image_env) $(dc) $(files_deploy_db) pull $(service_name)
	@$(image_env) $(dc) $(files_deploy_db) up -d --force-recreate $(service_name)
