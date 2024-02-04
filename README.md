# myfolio

A personal portfolio tracker.

![Dashboard](https://choffmeister.github.io/myfolio/screenshots/dashboard.png)

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
      # comment if you want to register manually
      USER_EMAIL: 'test@test.com'
      USER_PASSWORD: 'testtest'
      # uncomment if you want to allow registration of new users
      # USER_REGISTRATION_ENABLED: '1'
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
