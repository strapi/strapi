# Render

This guide explains how to update an existing Strapi project so it can be deployed on [Render](https://render.com).

With persistent disks and managed PostgreSQL databases, Render gives you multiple different ways to store your content. Render services come with fully managed SSL, so it's no longer necessary to set up a proxy server to secure your Strapi app. Since Render services are automatically restarted if they become unresponsive, you don't need to use a process manager like `pm2` either.

::: tip
For more information consult [Render's Deploy Strapi guide](https://render.com/docs/deploy-strapi)
:::

### Step 1: Create a Render Account

Visit [the Render dashboard](https://dashboard.render.com) to create an account if you don't already have one.

### Step 2: Choose Your Content Storage Method

You have to choose which database system to use for storing structured content, and where to store uploaded media library files.

Below are descriptions of 3 approaches that make different trade-offs between scalability, availability, simplicity, and cost.

- **SQLite and Uploads on Disk**: this option will use a [Render persistent disk](https://render.com/docs/disks) to store both a SQLite database file and uploaded media library files. This is a simple and inexpensive approach, appropriate if, for example, you're using Strapi as the data source for a static site generator. See [Render's `strapi-sqlite` repository](https://github.com/render-examples/strapi-sqlite) for an example of this approach.
- **Managed PostgreSQL and Uploads on Cloudinary**: if you're using Strapi as the backend for a website or app that dynamically fetches content, scalability and availability are more important. Use a [managed PostgreSQL database](https://render.com/docs/databases) and Cloudinary for uploads to get [horizontal scaling](#step-6-scale) and [zero downtime deploys](https://render.com/docs/zero-downtime-deploys). See [Render's `strapi-postgres-cloudinary` repository](https://github.com/render-examples/strapi-postgres-cloudinary) for an example of this approach.
- **Managed PostgreSQL and Uploads on Disk**: if you care about performance but can tolerate a few seconds of downtime when you deploy, you can cut costs compared to a paid Cloudinary plan with a hybrid approach. Use [managed PostgreSQL](https://render.com/docs/databases) for structured content and [block storage](https://render.com/docs/disks) for uploads. If your project doesn't use the media library you can remove the disk to get [horizontal scaling](#step-6-scale) and [zero downtime deploys](https://render.com/docs/zero-downtime-deploys). See [Render's `strapi-postgres` repository](https://github.com/render-examples/strapi-postgres) for an example of this approach.

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
      - key: DATABASE_URL
        fromDatabase:
          name: strapi
          property: connectionString
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
      - key: DATABASE_URL
        fromDatabase:
          name: strapi
          property: connectionString
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

Copy `config/env/production` and its contents from the example repository that corresponds to your [storage preference](#step-2-choose-your-content-storage-method).

If you attach a [custom domain](https://render.com/docs/custom-domains) to your Render service, use it as the `url` attribute in `server.js`.

For PostgreSQL, install the `pg` package from npm. If you're using Cloudinary, install `strapi-provider-upload-cloudinary`.

::: tip
The [Configuration doc](../concepts/configurations.html) has more info on configuring Strapi
:::

### Step 5: Deploy

1. Commit your changes and push them to GitHub or GitLab.
2. In the Render dashboard select **YAML** in the side navigation and click the **New From YAML** button.
3. Give Render permission to access your GitHub or GitLab repository if you haven't already.
4. Select the repository and branch for your Strapi project and follow the prompts that appear. If you're using Cloudinary, you'll be asked to enter your account credentials as environment variables. Render encrypts environment variables and stores them securely.

### Step 6: Scale

For vertical scaling, upgrade your service to a plan with more CPU and RAM per instance. If you're using a managed database you can upgrade its plan as well. Visit [Render's pricing page](https://render.com/pricing) and consider the [recommended requirements](../getting-started/deployment.html#recommended-requirements) in choosing the best plan for your needs. To upgrade, change [the `plan` field(s)](https://render.com/docs/yaml-spec#plans) in your `render.yaml` file.

Render services without attached disks can be horizontally scaled. Add [a `numInstances` field](https://render.com/docs/yaml-spec#number-of-instances) in your `render.yaml` file to get multiple instances of your Strapi application running in parallel. Render automatically load balances requests among your instances.

For manually-managed infrastructure you can change the plan and number of instances from the **Settings** tab in the Render dashboard.
