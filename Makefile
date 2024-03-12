project_name = ystuty_service_schedule
service_name = app_srv

up-build:
	docker compose -p "$(project_name)" -f docker-compose.yml up -d --build $(service_name)

up:
	docker compose -p "$(project_name)" -f docker-compose.yml up -d $(service_name)

down:
	docker compose -p "$(project_name)" down
