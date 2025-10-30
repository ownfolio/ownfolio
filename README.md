# myfolio

A personal portfolio tracker.

![Dashboard](https://choffmeister.github.io/myfolio/screenshots/dashboard.png)

## Development

```bash
docker compose up -d postgres
npm run start -- create-user --email test@test.com --password testtest --demo-portfolio
npm run start:dev
```

## Quick start

```yaml
# docker-compose.yaml
services:
  myfolio:
    image: 'ghcr.io/choffmeister/myfolio:latest'
    ports:
      - '3000:3000'
    environment:
      PGHOST: 'postgres'
      PGDATABASE: 'myfolio'
      PGUSER: 'myfolio'
      PGPASSWORD: 'myfolio'
      USER_REGISTRATION_ENABLED: '1'
    depends_on:
      - postgres
  postgres:
    image: 'postgres:15'
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: 'myfolio'
      POSTGRES_USER: 'myfolio'
      POSTGRES_PASSWORD: 'myfolio'
```

## Changelog

See [here](https://choffmeister.github.io/myfolio/changelog).
