# Render

[Render](https://render.com) and Strapi make a great match. With persistent disks and managed PostgreSQL databases, Render gives you multiple different ways to store your content. Render services come with fully managed SSL, so it's no longer necessary to set up a proxy server to secure your Strapi app. Since Render services are automatically restarted if they become unresponsive, you don't need to use a process manager like `pm2` either.

This guide explains how to update an existing Strapi project so it can be deployed on Render. Visit [Render One-Click Deploy](../installation/render.html) to deploy an new Strapi project on Render in one click.

::: tip
For more information consult [Render's Deploy Strapi guide](https://render.com/docs/deploy-strapi)
:::

### Step 1: Create a Render Account

Visit [the Render dashboard](https://dashboard.render.com) to create an account if you don't already have one.

### Step 2: Choose Your Content Storage Method

You have two decisions to make:

1. Which database system to use for storing structured content
2. Where to store uploaded media library files

Render is flexible enough to accommodate a variety of content storage options. Below are descrptions of three approaches that make different trade-offs between scalability, availability, simplicity, and cost.

#### 2.1. SQLite and Uploads on Disk

This option will use a [Render persistent disk](https://render.com/docs/disks) to store both a SQLite database file and uploaded media library files. This is a simple and inexpensive approach, appropriate if for example you're using Strapi as the data source for a static site generator. [Render's `strapi-sqlite` repo](https://github.com/render-examples/strapi-sqlite) demonstrates this approach.

#### 2.2. Managed PostgreSQL and Uploads on Cloudinary

If you're using Strapi as the backend for a website or app that dynamically fetches content, scalability and availability are more important. Use a [managed PostgreSQL database](https://render.com/docs/databases) and Cloudinary for uploads to get [horizontal scaling](#step-6-scale) and [zero downtime deploys](https://render.com/docs/zero-downtime-deploys). [Render's `strapi-postgres-cloudinary` repo](https://github.com/render-examples/strapi-postgres-cloudinary) demonstrates this approach.

#### 2.3. Managed PostgreSQL and Uploads on Disk

If you care about performance but can tolerate a few seconds of downtime when you deploy, you can cut costs compared to a paid Cloudinary plan with a hybrid approach. Use [managed PostgreSQL](https://render.com/docs/databases) for structured content and [block storage](https://render.com/docs/disks) for uploads. If your project doesn't use the media library you can remove the disk to get [horizontal scaling](#step-6-scale) and [zero downtime deploys](https://render.com/docs/zero-downtime-deploys). [Render's `strapi-postgres` repo](https://github.com/render-examples/strapi-postgres) demonstrates this approach.

### Step 3: Add a render.yaml File

Select the [render.yaml file](https://render.com/docs/yaml-spec) that matches your storage preferences and add it to the root of your Strapi project.

:::: tabs

::: tab strapi-sqlite

```yaml
services:
  - type: web
    name: strapi
    env: node
    plan: starter
    buildCommand: yarn install && yarn build
    startCommand: rsync -a public/ /data/public/ && yarn start
    healthCheckPath: /_health
    disk:
      name: strapi-data
      mountPath: /data
      sizeGB: 1
    envVars:
      - key: NODE_VERSION
        value: 12.18.4
      - key: NODE_ENV
        value: production
      - key: DATABASE_FILENAME
        value: /data/strapi.db
      - key: JWT_SECRET
        generateValue: true
      - key: ADMIN_JWT_SECRET
        generateValue: true
```

:::

::: tab strapi-postgres-cloudinary

```yaml
services:
  - type: web
    name: strapi
    env: node
    plan: starter
    buildCommand: yarn install && yarn build
    startCommand: yarn start
    healthCheckPath: /_health
    envVars:
      - key: NODE_VERSION
        value: 12.18.4
      - key: NODE_ENV
        value: production
      - key: CLOUDINARY_NAME
        sync: false
      - key: CLOUDINARY_KEY
        sync: false
      - key: CLOUDINARY_SECRET
        sync: false
      - key: DATABASE_HOST
        fromDatabase:
          name: strapi
          property: host
      - key: DATABASE_PORT
        fromDatabase:
          name: strapi
          property: port
      - key: DATABASE_USER
        fromDatabase:
          name: strapi
          property: user
      - key: DATABASE_PASSWORD
        fromDatabase:
          name: strapi
          property: password
      - key: DATABASE_NAME
        fromDatabase:
          name: strapi
          property: database
      - key: JWT_SECRET
        generateValue: true
      - key: ADMIN_JWT_SECRET
        generateValue: true

databases:
  - name: strapi
    plan: starter
```

:::

::: tab strapi-postgres

```yaml
services:
  - type: web
    name: strapi
    env: node
    plan: starter
    buildCommand: yarn install && yarn build
    startCommand: yarn start
    healthCheckPath: /_health
    disk:
      name: strapi-uploads
      mountPath: /opt/render/project/src/public/uploads
      sizeGB: 1
    envVars:
      - key: NODE_VERSION
        value: 12.18.4
      - key: NODE_ENV
        value: production
      - key: DATABASE_HOST
        fromDatabase:
          name: strapi
          property: host
      - key: DATABASE_PORT
        fromDatabase:
          name: strapi
          property: port
      - key: DATABASE_USER
        fromDatabase:
          name: strapi
          property: user
      - key: DATABASE_PASSWORD
        fromDatabase:
          name: strapi
          property: password
      - key: DATABASE_NAME
        fromDatabase:
          name: strapi
          property: database
      - key: JWT_SECRET
        generateValue: true
      - key: ADMIN_JWT_SECRET
        generateValue: true

databases:
  - name: strapi
    plan: starter
```

:::

::::

Alternatively, you can manually configure your service and database in the Render dashboard, instead of using [infrastructure as code](https://render.com/docs/infrastructure-as-code).

### Step 4: Configure Strapi for Production

Copy `config/env/production` and its contents from the example repo that corresponds to your [storage preference](#step-2-choose-your-content-storage-method):

- [SQLite and Disk](https://github.com/render-examples/strapi-sqlite)
- [PostgreSQL and Cloudinary](https://github.com/render-examples/strapi-postgres-cloudinary)
- [PostgreSQL and Disk](https://github.com/render-examples/strapi-postgres)

If you attach a [custom domain](https://render.com/docs/custom-domains) to your Render service, use it as the `url` attribute in `server.js`.

For PostgreSQL, install the `pg` package from npm. If you're using Cloudinary, install `strapi-provider-upload-cloudinary`.

::: tip
The [Configuration doc](../concepts/configurations.html) has more info on configuring Strapi
:::

### Step 5: Deploy

1. Commit your changes and push them to GitHub or GitLab.
2. In the Render dashboard select **YAML** in the side nav and then click the **New From YAML** button.
3. Give Render permission to access your GitHub or GitLab repo if you haven't already.
4. Select the repo and branch for your Strapi project and follow the prompts that appear. If you're using Cloudinary, you'll be asked to enter your account credentials as environment variables. Render encrypts environment variables and stores them securely.

### Step 6: Scale

For vertical scaling, upgrade your service to a plan with more CPU and RAM per instance. If you're using a managed database you can upgrade its plan as well. Visit [Render's pricing page](https://render.com/pricing) and consider the [recommended requirements](../getting-started/deployment.html#recommended-requirements) in choosing the best plan for your needs. To upgrade, just change [the `plan` field(s)](https://render.com/docs/yaml-spec#plans) in your `render.yaml` file.

Render services without attached disks can be horizontally scaled. Add [a `numInstances` field](https://render.com/docs/yaml-spec#number-of-instances) in your `render.yaml` file to get multiple instances of your Strapi app running in parallel. Render automatically load balances requests among your instances.

For manually-managed infrastructure you can change the plan and number of instances from the **Settings** tab in the Render dashboard.

::: tip
If you have a question, post it to [Render's community forum](https://community.render.com)
:::
