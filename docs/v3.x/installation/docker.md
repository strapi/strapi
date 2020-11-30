# Installing using Docker

If you're already familiar with Docker, you are probably looking for our official Docker images over [Docker Hub](https://hub.docker.com/r/strapi/strapi).

[[toc]]

## Step 1: Create a `docker-compose.yaml` file

Create this `docker-compose.yaml` file in an empty folder. <br>
A fresh new Strapi application will be created where the `docker-compose.yaml` file is located.

This docker-compose defines our database and Strapi service and links them.

:::: tabs

::: tab SQLite

```yaml
version: '3'
services:
  strapi:
    image: strapi/strapi
    volumes:
      - ./app:/srv/app
    ports:
      - '1337:1337'
```

:::

::: tab PostgreSQL

```yaml
version: '3'
services:
  strapi:
    image: strapi/strapi
    environment:
      DATABASE_CLIENT: postgres
      DATABASE_NAME: strapi
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_USERNAME: strapi
      DATABASE_PASSWORD: strapi
    volumes:
      - ./app:/srv/app
    ports:
      - '1337:1337'
    depends_on:
      - postgres

  postgres:
    image: postgres
    environment:
      POSTGRES_DB: strapi
      POSTGRES_USER: strapi
      POSTGRES_PASSWORD: strapi
    volumes:
      - ./data:/var/lib/postgresql/data
```

:::

::: tab MongoDB

```yaml
version: '3'
services:
  strapi:
    image: strapi/strapi
    environment:
      DATABASE_CLIENT: mongo
      DATABASE_NAME: strapi
      DATABASE_HOST: mongo
      DATABASE_PORT: 27017
      DATABASE_USERNAME: strapi
      DATABASE_PASSWORD: strapi
    volumes:
      - ./app:/srv/app
    ports:
      - '1337:1337'
    depends_on:
      - mongo

  mongo:
    image: mongo
    environment:
      MONGO_INITDB_DATABASE: strapi
      MONGO_INITDB_ROOT_USERNAME: strapi
      MONGO_INITDB_ROOT_PASSWORD: strapi
    volumes:
      - ./data:/data/db
```

:::

::: tab MySQL

```yaml
version: '3'
services:
  strapi:
    image: strapi/strapi
    environment:
      DATABASE_CLIENT: mysql
      DATABASE_HOST: mysql
      DATABASE_PORT: 3306
      DATABASE_NAME: strapi
      DATABASE_USERNAME: strapi
      DATABASE_PASSWORD: strapi
      DATABASE_SSL: 'false'
    volumes:
      - ./app:/srv/app
    ports:
      - '1337:1337'
    depends_on:
      - mysql

  mysql:
    image: mysql
    command: mysqld --default-authentication-plugin=mysql_native_password
    volumes:
      - ./data:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: strapi
      MYSQL_DATABASE: strapi
      MYSQL_USER: strapi
      MYSQL_PASSWORD: strapi
```

:::

::: tab MariaDB

```yaml
version: '3'
services:
  strapi:
    image: strapi/strapi
    environment:
      DATABASE_CLIENT: mysql
      DATABASE_HOST: mariadb
      DATABASE_PORT: 3306
      DATABASE_NAME: strapi
      DATABASE_USERNAME: strapi
      DATABASE_PASSWORD: strapi
      DATABASE_SSL: 'false'
    volumes:
      - ./app:/srv/app
    ports:
      - '1337:1337'
    depends_on:
      - mariadb

  mariadb:
    image: mariadb
    volumes:
      - ./data:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: strapi
      MYSQL_DATABASE: strapi
      MYSQL_USER: strapi
      MYSQL_PASSWORD: strapi
```

:::

::::

## Step 2: Pull the latest images

```
docker-compose pull
```

## Step 3: Run the stack

```
docker-compose up -d
```
