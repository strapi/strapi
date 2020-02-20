# Installing using Platform.sh

[Plateform.sh](https://console.platform.sh/) provide you an easy way to getting start and deploy your Strapi application.

You can find the template [source code](https://github.com/platformsh-templates/strapi#customizations) on Platform.sh GitHub for more information.

[[toc]]

### Step 1: Create a Platform.sh account

You must have a [Plateform.sh](https://platform.sh/) account before doing these steps.

### Step 2: Create a project

You can use the **One-Click** button or follow these steps.

<a href="https://console.platform.sh/projects/create-project?template=https://raw.githubusercontent.com/platformsh/template-builder/master/templates/strapi/.platform.template.yaml&utm_content=strapi&utm_source=github&utm_medium=button&utm_campaign=deploy_on_platform">
    <img src="https://platform.sh/images/deploy/lg-blue.svg" alt="Deploy on Platform.sh" width="180px" />
</a>

- Click on `+ Add project` button
- Select `Use a template` option and click `Next`
- Fill your `Project name` and `Region` then click `Next`

**Choose Strapi template.**

Search for the Strapi template using the search bar.

- Click on the search bar
- Fill `strapi`
- Select the Strapi template
- Click `Next`

::: tip INFO
After few second a Strapi application will be setup with a Postgres database.
:::

### Step 4: Visit your app

Now to visit your application.

- Click on `Settings`
- Then `Domains` in the left menu

You will see the Platform.sh domain name that is used for your app.
