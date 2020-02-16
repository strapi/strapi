# Containerizing Strapi with Docker

Docker greatly simplifies the deployment process of Strapi to various cloud providers and enables best practices in devops by building your code once and promoting through environments.

## Prerequisites

The easiest way to get started with docker is by downloading Docker Desktop and using your personal Docker Hub repositories

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Docker Hub](https://hub.docker.com)

## Building the Application

Create a `.dockerignore` file in the application root to ignore some directories, similar to `.gitignore`.

**Path —** `./project/.dockerignore`

```
node_modules
build
.cache
```

Create a `Dockerfile` in the application root.

**Path —** `./project/Dockerfile`

:::: tabs

::: tab yarn

```docker
FROM node:alpine

WORKDIR /app

COPY ./package.json ./
COPY ./yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

EXPOSE 1337

CMD ["yarn","start"]
```

:::

::: tab npm

```docker
FROM node:alpine

WORKDIR /app

COPY ./package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 1337

CMD ["npm", "run", "start"]
```

:::

::::

Build the image and push to your Docker Hub repository with the following

**Path —** `./project/`

```bash
docker build -t dockerhubaccount/project:latest .

docker push dockerhubaccount/project:latest
```

You can run a single container locally with the following.

```bash
docker run -it -e NODE_ENV=development -p 1337:1337 dockerhubaccount/project
```

Keeping up with the list of environment variables and long docker run command can be cumbersome. In the next section we'll make use of docker compose to simplify local development.

## Development Workflow with Docker Compose

Docker compose makes it easy to develop with docker containers. You need only a `docker-compose.yaml` file which will pull all of the images, create the containers from the images, and create a network that allows your containers to communicate with each other.

### Environment Variables

Create an env file for easily importing and updating environment variables with docker-compose.

::: warning
Do not commit the `.env` file. You may commit a `.env.example` file with example values for collaboration, but your `.env` may hold private keys for authorization that should not be shared.

You don't need to create a `.env` file, you may instead opt to uses your local machine's environment variables or hardcode them in `docker-compose.yaml`. If you use the latter, do not commit the file with sensitive data.
:::

**Path —** `./project/`

```bash
touch .env
```

Fill in with environment variables needed for your application to run. This would include any and all environment variables your app uses and any environment variables needed for your database container. This is an example that uses PostgreSQL.

::: tip
The database host comes from the name of the service we specify later in `docker-compose.yaml`. Docker compose creates the network and exposes the service name of each service to the network, for example `http://strapi-db` for our database.
:::

**Path —** `./project/.env`
:::: tabs

::: tab PostgresSQL

```
PORT=1337
NODE_ENV=development

DATABASE_HOST=strapi-db
DATABASE_PORT=5432

POSTGRES_DB=strapi
POSTGRES_USER=user
POSTGRES_PASSWORD=hunter42
```

:::

::::

### Docker Compose Configuration

Create the `docker-compose.yaml` in the application root and write your configurations.

**Path —** `./project/docker-compose.yaml`

:::: tabs

::: tab PostgreSQL

```yaml
version: '3'
services:
  strapi-cms:
    image: strapi/base
    working_dir: /src
    command: yarn develop # or npm run develop
    volumes:
      # this mounts a volume from our strapi source code
      - ./project:/src
    ports:
      - ${PORT}:${PORT}
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=${PORT}
      - DATABASE_HOST=${DATABASE_HOST}
      - DATABASE_PORT=${DATABASE_PORT}
      - DATABASE_NAME=${POSTGRES_DB}
      - DATABASE_USERNAME=${POSTGRES_USER}
      - DATABASE_PASSWORD=${POSTGRES_PASSWORD}
    depends_on:
      - strapi-db
  # the database service name below matches the
  # name of our database host env variable
  strapi-db:
    image: postgres:12
    ports:
      - ${DATABASE_PORT}:${DATABASE_PORT}
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      # this mounts a volume from our home directory called
      # postgres-data that will persist even when the container stops
      - ~/postgres-data:/var/lib/postgresql/data
```

:::

::::

### Development process

The following commands will bring up your Strapi application and database and close it down when you are finished.

**Path —** `./project/`

```bash
docker-compose up

docker-compose down
```

## Continuous Integration

Build pipelines allow us to build and push container images automatically when code is pushed or merged to a remote repository. These images can be used later for deployments.

:::: tabs

::: tab "Azure Pipelines"

This pipeline builds the image, tags it with a unique id, and pushes to Docker Hub.

```yaml
name: $(Build.BuildId)
trigger:
  branches:
    include:
      - master
pool:
  vmImage: 'ubuntu-latest'
steps:
  - task: Docker@2
    inputs:
      containerRegistry: 'DockerHub'
      repository: 'dockerhubaccount/project'
      command: 'buildAndPush'
      Dockerfile: 'Dockerfile'
      tags: |
        $(Build.BuildId)
```

:::

::: tab "GitHub Actions"

This pipeline builds the image, tags it with a unique id, and pushes to Docker Hub.

```yaml
name: Docker Image CI

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - name: Docker login
        run: echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
      - name: Build the Docker image
        run: docker build -t "$DOCKER_USERNAME/$APP_NAME:$(date +%s)" .
      - name: Push the Docker image
        run: docker push "$DOCKER_USERNAME/$APP_NAME"
    env:
      DOCKER_USERNAME: dockerhubaccount
      DOCKER_PASSWORD: ${{ secrets.your_secret }}
      APP_NAME: project
```

::::

## Deployment

Now that your Strapi app is a container image the deploment details can be abstracted away and handled by cloud providers' web services. Here are some helpful links for deploying images.

- [Azure App Service](https://docs.microsoft.com/en-us/azure/app-service/containers/quickstart-docker)
- [Amazon ECS](https://aws.amazon.com/getting-started/tutorials/deploy-docker-containers/)
- [Google App Engine](https://cloud.google.com/appengine/docs/flexible/custom-runtimes/testing-and-deploying-your-app)
- [Heroku](https://devcenter.heroku.com/articles/container-registry-and-runtime)
