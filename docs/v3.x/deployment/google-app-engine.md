# Google App Engine

In this guide we are going to:

- Create a new Strapi project
- Configure PostgreSQL for the production enviroment
- Deploy the app to Google App Engine
- Add the [Google Cloud Storage file uploading plugin](https://github.com/Lith/strapi-provider-upload-google-cloud-storage) by [@Lith](https://github.com/Lith)

### New Strapi project

:::: tabs

::: tab yarn

Use **yarn** to install the Strapi project (**recommended**). [Install yarn with these docs](https://yarnpkg.com/lang/en/docs/install/)

```bash
yarn create strapi-app my-project --quickstart
```

:::

::: tab npx

Use **npm/npx** to install the Strapi project

```bash
npx create-strapi-app my-project --quickstart
```

:::

::::

When the setup completes, register an admin user using the form which opens in the browser. This user will be only relevant in local development.

The `sqlite` database is created at `.tmp/data.db`.

Login, but don't add content types yet. Close the browser. Quit the running app.

### Initial commit

This may be a good point to commit the files in their initial state.

```bash
cd my-project
git init
git add .
git commit -m first
```

### Install the Cloud SDK CLI tool

[Cloud SDK: Command Line Interface](https://cloud.google.com/sdk/)

### New App Engine project

Create a new [App Engine](https://console.cloud.google.com/appengine/) project.

Select the region, such as `europe-west`.

- Language: Node JS
- Environment: Standard (or Flexible)

(_A note on performance and cost_: the `Standard Environment` is sufficient for development, but it may not be for production. Review the resources your application will need to determine the cost. When you sign up for Google App Engine, it offers a certain amount of free credits which will not be billed.)

Create the project. Take note of the instance identifier, which is in the form of `<instance_id>:<region>:<instance_name>`.

Check if `gcloud` lists the project:

```bash
gcloud projects list
```

Run `init` to authenticate the cli, and select current cloud project.

```bash
gcloud init
```

### Create the database (PostgreSQL)

Create the [Cloud SQL database](https://cloud.google.com/sql/docs/postgres/create-manage-databases) which the app is going to use.

Take note of the user name (default is `postgres`) and password.

The first database will be created with the name `postgres`. This cannot be deleted.

Create another database, named `strapi` for example. It may be useful to delete and and re-create this while you are experimenting with the application setup.

### Create app.yaml and .gcloudignore

Create the `app.yaml` file in the project root.

Add `app.yaml` to `.gitignore`.

The instance identifier looks like `myapi-123456:europe-west1:myapi`.

The `myapi-123456` part is the project identifier. (The number is automatically added to short project names).

The following is an example config for `Standard Environment` or `Flexible Environment`.

:::: tabs

::: tab Standard Environment

```yaml
runtime: nodejs10

instance_class: F2

env_variables:
  HOST: '0.0.0.0'
  NODE_ENV: 'production'
  DATABASE_NAME: 'strapi'
  DATABASE_USERNAME: 'postgres'
  DATABASE_PASSWORD: '<password>'
  INSTANCE_CONNECTION_NAME: '<instance_identifier>'

beta_settings:
  cloud_sql_instances: '<instance_identifier>'
```

:::

::: tab Flexible Environment

```yaml
runtime: nodejs10

env: flex

env_variables:
  HOST: '0.0.0.0'
  NODE_ENV: 'production'
  DATABASE_NAME: 'strapi'
  DATABASE_USERNAME: 'postgres'
  DATABASE_PASSWORD: '<password>'
  INSTANCE_CONNECTION_NAME: '<instance_identifier>'

beta_settings:
  cloud_sql_instances: '<instance_identifier>'
```

:::

::::

Create `.gcloudignore` in the project root, include `app.yaml` here as well.

```
app.yaml
.gcloudignore
.git
.gitignore
node_modules/
#!include:.gitignore
```

In the case of Strapi, the admin UI will have to be re-built after every deploy,
and so we don't deploy local build artifacts, cache files and so on by including
the `.gitignore` entries.

### Configure the database

The `PostgreSQL` database will need the `pg` package.

```bash
yarn add pg
```

[Google App Engine requires](https://cloud.google.com/sql/docs/postgres/connect-app-engine) to connect to the database using the unix socket path, not an IP and port.

Edit `database.js`, and use the socket path as `host`.

`Path: ./config/env/production/database.js`.

```js
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'postgres',
        host: `/cloudsql/${env('INSTANCE_CONNECTION_NAME')}`,
        database: env('DATABASE_NAME'),
        username: env('DATABASE_USERNAME'),
        password: env('DATABASE_PASSWORD'),
      },
      options: {},
    },
  },
});
```

### Auto-build after deploy

After deployment, the admin UI has to be re-built. This generates the contents of the `build` folder on the server.

In `package.json`, add the `gcp-build` command to `scripts`:

```json
{
  "scripts": {
    "gcp-build": "strapi build"
  }
}
```

### Deploy

```bash
gcloud app deploy app.yaml --project myapi-123456
```

Watch the logs:

```bash
gcloud app logs tail --project=myapi-123456 -s default
```

Open the admin page and register and admin user.

```
https://myapp-123456.appspot.com/admin/
```

### File uploading to Google Cloud Storage

[Lith/strapi-provider-upload-google-cloud-storage](https://github.com/Lith/strapi-provider-upload-google-cloud-storage)

```bash
yarn add strapi-provider-upload-google-cloud-storage
```

Deploy so that the server app includes the dependency from `package.json`.

Follow the [documentation of the plugin](https://github.com/Lith/strapi-provider-upload-google-cloud-storage/blob/master/README.md) for the full configuration.

### Post-setup configuration

**CORS**

CORS is enabled by default, allowing `*` origin. You may want to limit the allowed origins.

Read the documentation [here](../concepts/middlewares.md)

**Changing the admin url**

```
config/env/production/server.js
```

```js
module.exports = {
  admin: {
    path: '/dashboard',
  },
};
```
