# Render One-Click Deploy

This guide explains how to deploy a new Strapi project on [Render](https://render.com) in one click.

With persistent disks and managed PostgreSQL databases, Render gives you multiple different ways to store your content. Render services come with fully managed SSL, so it's no longer necessary to set up a proxy server to secure your Strapi application. Since Render services are automatically restarted if they become unresponsive, you don't need to use a process manager like `pm2` either.

::: tip
For more information consult [Render's Deploy Strapi guide](https://render.com/docs/deploy-strapi)
:::

### Step 1: Create a Render Account

Visit [the Render dashboard](https://dashboard.render.com) to create an account if you don't already have one.

### Step 2: Fork an Example Repository

Render maintains 3 Strapi on Render example repositories, which differ based on which database is used and where uploaded media library files are stored:

1. [Strapi with SQLite and uploads on disk](https://github.com/render-examples/strapi-sqlite)
2. [Strapi with PostgreSQL and uploads on Cloudinary](https://github.com/render-examples/strapi-postgres-cloudinary)
3. [Strapi with PostgreSQL and uploads on disk](https://github.com/render-examples/strapi-postgres)

Read [Render's Deploy Strapi guide](https://render.com/docs/deploy-strapi) to get help choosing the best option for your use case. Once you've chosen, fork the repository on GitHub so you have the flexibility to make your own changes.

### Step 3: Deploy

Click the **Deploy to Render** button in the forked repository's `README` file. Give Render permission to access your repository if you haven't already. If you're using Cloudinary, you'll be prompted to enter your account credentials as environment variables. Render encrypts environment variables and stores them securely.

### Step 4: Add Content Types

Your Strapi application on Render will be running in production mode, with `NODE_ENV=production`. To add or edit content types via the admin UI, you need to run Strapi locally in development mode. Clone the forked repository to your local machine, `cd` into it, and run `yarn install && yarn develop`. When you're ready, commit your changes and push them to your remote repository. Render will auto-deploy the changes to your production application. A [typical workflow](https://render.com/docs/deploy-strapi#development-%E2%86%92-staging-%E2%86%92-production) would also include a staging environment for testing.
