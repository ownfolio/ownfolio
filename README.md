# ownfolio

A personal portfolio tracker.

![Dashboard](https://ownfolio.github.io/ownfolio/screenshots/dashboard.png)

## Development

```bash
# install dependencies
npm login --registry https://npm.pkg.github.com
npm ci
```

```bash
# run database and create test data
docker compose up -d postgres
npm run start -- create-user --email test@test.com --password testtest --demo-portfolio
```

```bash
# run dev server
npm run start:dev
```

## Quick start

```yaml
# docker-compose.yaml
services:
  ownfolio:
    image: 'ghcr.io/ownfolio/ownfolio:latest'
    ports:
      - '3000:3000'
    environment:
      PGHOST: 'postgres'
      PGDATABASE: 'ownfolio'
      PGUSER: 'ownfolio'
      PGPASSWORD: 'ownfolio'
      USER_REGISTRATION_ENABLED: '1'
    depends_on:
      - postgres
  postgres:
    image: 'postgres:15'
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: 'ownfolio'
      POSTGRES_USER: 'ownfolio'
      POSTGRES_PASSWORD: 'ownfolio'
```

## Changelog

See [here](https://ownfolio.github.io/ownfolio/changelog).
