# IBM Cloud

This is a step-by-step guide for deploying a Strapi project on [IBM Cloud](https://www.ibm.com/cloud). Among the available alternatives, this guide covers the deployment on [IBM Cloud Foundry](https://www.cloudfoundry.org/the-foundry/ibm-cloud-foundry) using the official database services.

### IBM Cloud Install Requirements

- You must have a [free IBM Cloud account](https://cloud.ibm.com/registration) before doing these steps.

If you already have the IBM Cloud CLI installed locally on your computer. Skip to [Login to IBM Cloud](#_2-login-to-ibm-cloud-from-your-cli).

#### 1. IBM Cloud CLI Installation

Download and install the [CLI](https://cloud.ibm.com/docs/cli?topic=cli-getting-started) for your operating system:

:::: tabs

::: tab "Mac O/S"
Run the following from your terminal:

```bash
curl -sL https://ibm.biz/idt-installer | bash
```

:::

::: tab Ubuntu
Run the following from your terminal:

```bash
curl -sL https://ibm.biz/idt-installer | bash
```

:::

::: tab Windows
Run the following in Powershell as administrator:

```bash
[Net.ServicePointManager]::SecurityProtocol = "Tls12, Tls11, Tls, Ssl3"; iex(New-Object Net.WebClient).DownloadString('https://ibm.biz/idt-win-installer')
```

:::

::::

#### 2. Login to IBM Cloud from your CLI

Next, you need to login to IBM Cloud from your computer.

```bash
ibmcloud login
```

Follow the instructions and return to your command line.

#### 3. Create a new project (or use an existing one)

Create a [new Strapi project](../getting-started/quick-start.md) (if you want to deploy an existing project go to step 4).

::: warning NOTE

If you plan to use **MongoDB** with your project, [refer to the create a Strapi project with MongoDB section of the documentation](../guides/databases.md#install-mongodb-locally) then, jump to step 4.

:::

`Path: ./`

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

::: tip
When you use `--quickstart` to create a Strapi project locally, a **SQLite database** is used which is not compatible with IBM Cloud. Therefore, another database option [must be chosen](#_7-ibm-cloud-database-set-up).
:::

#### 4. Update `.gitignore`

Add the following line at end of `.gitignore`:

`Path: ./my-project/.gitignore`

```txt
package-lock.json
```

Even if it is usually recommended to version this file, it may create issues on Cloud Foundry.

#### 5. Create `.cfignore`

Copy all the content of the `.gitignore` except the next line:

`Path: ./my-project/.gitignore`

```txt
build
```

And add the next ones:

```txt
.editorconfig
.env.example
.gitignore
manifest.yml
README.md
```

#### 6. Create `manifest.yml`

Add the next lines:

`Path: ./my-project/manifest.yml`

```yml
applications:
  - name: 'My project'
    routes:
      - route: my-project.mybluemix.net
    env:
      FORCE_HTTPS: true
      NODE_ENV: production
      URL: https://my-project.mybluemix.net
```

#### 7. IBM Cloud proxy set-up

Replace the `server.js` file with the following:

`Path: ./config/server.js`.

```js
module.exports = ({ env }) => {
  const myEnv = {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    url: env('URL', ''),
    admin: {},
  };

  return myEnv;
};
```

#### 8. Create a IBM Cloud project

With the first push the project is automatically created. This first run is going to fail due to database connection, but we're fixing it in the next steps.

`Path: ./my-project/`

```bash
ibmcloud app push "My Project"
```

Your local development environment is now set-up and configured to work with IBM Cloud. You have a new Strapi project and a new IBM Cloud app ready to be configured to work with a database and with each other.

#### 9. IBM Cloud Database set-up

Below you will find database options when working with IBM Cloud. Please choose the correct database (e.g. PostgreSQL, MongoDB, etc.) and follow those instructions.

:::: tabs

::: tab PostgreSQL

### IBM Postgres

Follow these steps to deploy your Strapi app to IBM Cloud using **PostgreSQL**:

#### 1. Create a [IBM Cloud Postgres service](https://cloud.ibm.com/catalog/services/databases-for-postgresql) for using Postgres

The easiest way is to do it through the web management panel.

#### 2. Retrieve database credentials

Once the new service is ready, new credentials need to be created (`service credentials` section).

A huge JSON file is generated but we are interested in the field called `connection.postgres.composed`. There you can find the values you need for the next step.

```txt
postgres://ibm_cloud_f999fe77_d44c_44f1_ad9a_d950111f381b:c6a1c55197f4855eb47d03401ddc5bfa9c8ba76472f420d7a1f968@00b111-888a-4f97-be11-e20a6517c0f9.6131b73286f34215871dfad7222b4f7d.databases.appdomain.cloud:31530/ibmclouddb?sslmode=verify-full"
```

(This url is read like so: `postgres:// USERNAME : PASSWORD @ HOST : PORT / DATABASE_NAME`)

#### 3. Set environment variables

Strapi expects a variable for each database connection configuration (host, username, etc.). So, from the url above, you have to set several environment variables in the IBM Cloud config:

```bash
ibmcloud app env-set "My Project" DATABASE_USERNAME ibm_cloud_f999fe77_d44c_44f1_ad9a_d950111f381b
ibmcloud app env-set "My Project" DATABASE_PASSWORD c6a1c55197f4855eb47d03401ddc5bfa9c8ba76472f420d7a1f968
ibmcloud app env-set "My Project" DATABASE_HOST 00b111-888a-4f97-be11-e20a6517c0f9.6131b73286f34215871dfad7222b4f7d.databases.appdomain.cloud
ibmcloud app env-set "My Project" DATABASE_PORT 31530
ibmcloud app env-set "My Project" DATABASE_NAME ibmclouddb
```

Please replace these above values with your actual values.

#### 4. Update your database config file

Replace the contents of `database.js` with the following:

`Path: ./config/database.js`.

```js
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'postgres',
        host: env('DATABASE_HOST', '127.0.0.1'),
        port: env.int('DATABASE_PORT', 27017),
        database: env('DATABASE_NAME', 'strapi'),
        username: env('DATABASE_USERNAME', ''),
        password: env('DATABASE_PASSWORD', ''),
      },
      options: {
        ssl: true,
      },
    },
  },
});
```

#### 5. Install the `pg` node module

Unless you originally installed Strapi with PostgreSQL, you need to install the [pg](https://www.npmjs.com/package/pg) node module.

`Path: ./my-project/`

```bash
npm install pg --save
```

:::

::: tab MongoDB

### IBM MongoDB

(Using Strapi and MongoDB requires different set-up and different configuration steps. You cannot use `--quickstart` to develop a `MongoDB` Strapi project.)

Please follow these steps to **deploy a Strapi app with MongoDB on IBM Cloud**.

#### 1. Create a [IBM Cloud MongoDB service](https://cloud.ibm.com/catalog/services/databases-for-mongodb) for using MongoDB

The easiest way is to do it through the web management panel.

#### 2. Retrieve database credentials

Once the new service is ready, new credentials need to be created (`service credentials` section).

A huge JSON file is generated but we are interested in the field called `connection.mongodb.composed`. There you can find the values you need for the next step.

```txt
mongodb://ibm_cloud_f999fe77_d44c_44f1_ad9a_d950111f381b:c6a1c55197f4855eb47d03401ddc5bfa9c8ba76472f420d7a1f968@bbccc1c1-6013-40c1-b17b-8b45ff36a96f-0.8117127f814b4a6ea643610826cd2123.databases.appdomain.cloud:32083,cacab8c8-7029-40c1-b17b-8b45ff36a96f-1.8117147f814b4b2ea643610826cd2046.databases.appdomain.cloud:32083/ibmclouddb?authSource=admin&replicaSet=replset
```

(This url is read like so: `mongodb:// USERNAME : PASSWORD @ HOST : PORT / DATABASE_NAME`)

#### 3. Set environment variables

Strapi also supports a URI format, instead a variable for each database connection configuration (host, username, etc.). So, you only have to set one environment variables in the IBM Cloud config:

```bash
ibmcloud app env-set "My Project" DATABASE_URI "mongodb://ibm_cloud_f999fe77_d44c_44f1_ad9a_d950111f381b:c6a1c55197f4855eb47d03401ddc5bfa9c8ba76472f420d7a1f968@bbccc1c1-6013-40c1-b17b-8b45ff36a96f-0.8117127f814b4a6ea643610826cd2123.databases.appdomain.cloud:32083,cacab8c8-7029-40c1-b17b-8b45ff36a96f-1.8117147f814b4b2ea643610826cd2046.databases.appdomain.cloud:32083/ibmclouddb?authSource=admin&replicaSet=replset"
```

Please replace these above values with your actual values.

#### 4. Update your database config file

`Path: ./config/database.js`.

```js
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'mongoose',
      settings: {
        uri: env('DATABASE_URI', 'mongodb://localhost:27017/myproject'),
      },
      options: {
        ssl: true,
      },
    },
  },
});
```

:::

::::

#### 10. Deploy changes

`Path: ./my-project/`

```bash
ibmcloud app push "My Project"
```

The deployment may take a few minutes. At the end, logs will display the url of your project (e.g. `https://my-project.mybluemix.net`).

If you see the Strapi Welcome page, you have correctly set-up, configured and deployed your Strapi project on IBM Cloud. You will now need to set-up your `admin user` as the production database is brand-new (and empty).

You can now continue with the [Tutorial - Creating an Admin User](../getting-started/quick-start-tutorial.md#_3-create-an-admin-user), if you have any questions on how to proceed.

::: warning
For security reasons, the Content Type Builder plugin is disabled in production. To update content structure, please make your changes locally and deploy again.
:::

### Project updates

When Strapi is deployed to IBM Cloud, IBM Cloud sets the environment variable to `NODE_ENV=production`. In `production mode` Strapi disables the content-type builder (for security reasons). Additionally, if you wanted to change the default production mode in IBM Cloud, it wouldn't work as [the file system is temporary](https://docs.cloudfoundry.org/devguide/deploy-apps/prepare-to-deploy.html#filesystem). Strapi writes files to the server when you update the content-types and these updates could disappear when IBM Cloud restarts the server.

Therefore, modifications that require writing to model creation or other json files, e.g. creating or changing content-types, require that you make those changes on your dev environment and then push the changes to IBM Cloud.

As you continue developing your application with Strapi, you may want to use continuous deployment, or you can continue to use `ibmcloud app push "My Project"` to commit and push changes to IBM Cloud directly.

### File Uploads

Like with project updates on IBM Cloud, the file system doesn't support local uploading of files as they could be wiped.

So, you will need to use an upload provider. You can view the documentation for installing providers [here](../plugins/upload.md#install-providers) and you can see a list of providers from both Strapi and the community on [npmjs.com](https://www.npmjs.com/search?q=strapi-provider-upload-&page=0&perPage=20). In example, if you wanted to use the [IBM Cloud Object Storage service](https://www.ibm.com/cloud/object-storage), you should use [this Strapi plugin](https://github.com/IBMResearch/strapi-provider-upload-ibm-object-storage).
