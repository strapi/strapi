# Render One-Click Deploy

[Render](https://render.com) and Strapi make a great match. With persistent disks and managed PostgreSQL databases, Render gives you multiple different ways to store your content. Render services come with fully managed SSL, so it's no longer necessary to set up a proxy server to secure your Strapi app. Since Render services are automatically restarted if they become unresponsive, you don't need to use a process manager like `pm2` either.

This guide explains how to deploy a new Strapi project on Render in one click. Visit [the Render deployment guide](../deployment/render.html) to learn how to update an existing Strapi project so it can be deployed on Render.

::: tip
For more information consult [Render's Deploy Strapi guide](https://render.com/docs/deploy-strapi)
:::

### Step 1: Create a Render Account

Visit [the Render dashboard](https://dashboard.render.com) to create an account if you don't already have one.

### Step 2: Fork an Example Repo

Render maintains three Strapi on Render example repos, which differ based on which database is used and where uploaded media library files are stored:

1. [Strapi with SQLite and uploads on disk](https://github.com/render-examples/strapi-sqlite)
2. [Strapi with PostgreSQL and uploads on Cloudinary](https://github.com/render-examples/strapi-postgres-cloudinary)
3. [Strapi with PostgreSQL and uploads on disk](https://github.com/render-examples/strapi-postgres)

Read [Render's Deploy Strapi guide](https://render.com/docs/deploy-strapi) to get help choosing the best option for your use case. Once you've chosen, fork the repo on GitHub so you have the flexibility to make your own changes.

### Step 3: Deploy

Click the **Deploy to Render** button in the repo's `README` file. Give Render permission to access your repo if you haven't already. If you're using Cloudinary, you'll be prompted to enter your account credentials as environment variables.

### (Optional) Step 4: Use Development Mode

Your Strapi app will be running in production mode. If you'd like the ability edit content types from the admin UI, you can change the value of `NODE_ENV` to `development` in the `render.yaml` file at the root of your forked repo. A more [typical workflow](https://render.com/docs/deploy-strapi#development-%E2%86%92-staging-%E2%86%92-production) would be to edit content types locally before pushing your changes to staging and production.

::: tip
If you have a question, post it to [Render's community forum](https://community.render.com)
:::
