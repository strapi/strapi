# Quick Start Guide

Get ready to get Strapi up and running in **less than 5 minutes** 🚀.

<div class="video-container">
<iframe width="853" height="480" src="https://www.youtube.com/embed/4m1wKzzfs-M" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

_For a step-by-step guide, please take a look at the [detailed tutorial](quick-start-tutorial.md)._

(Before continuing, please make sure [Node.js and npm are properly installed](install-requirements.md) on your machine. You can [install the Yarn v1.2.0+ package here](https://yarnpkg.com/en/).)

## 1. Install Strapi and Create a new project

:::: tabs

::: tab yarn

```bash
yarn create strapi-app my-project --quickstart
```

:::

::: tab npx

```bash
npx create-strapi-app my-project --quickstart
```

:::

::::

## 2. Create an Administrator user

Navigate to [**http://localhost:1337/admin**](http://localhost:1337/admin).

- Complete the form to create the first **Administrator** user.
- Click **Ready to start**.

## 3. Create a Restaurant Collection Type

Navigate to [**PLUGINS** - **Content Type Builder**](http://localhost:1337/admin/plugins/content-type-builder), in the left-hand menu.

- Click the **"+ Create new collection type"** link
- Enter `restaurant`, and click `Continue`
- A window opens with fields options:
  - Click the **Text** field
  - Type `name` in the **Name** field
  - Click over to the **ADVANCED SETTINGS** tab, and check the `Required field` and the `Unique field`
  - Click the **"+ Add another Field"** button
  - Click the **Rich Text** field
  - Type `description` under the **BASE SETTINGS** tab, in the **Name** field
  - Click `Finish`
- Click the **Save** button and wait for Strapi to restart

## 4. Create a Category Collection type

Navigate back to [**PLUGINS** - **Content Type Builder**](http://localhost:1337/admin/plugins/content-type-builder), in the left-hand menu.

- Click the **"+ Create new collection type"** link
- Enter `category`, and click `Continue`
- A window opens with fields options:
  - Click the **Text** field
  - Type `name` under the **BASE SETTINGS** tab, in the **Name** field
  - Click over to the **ADVANCED SETTINGS** tab, and check the `Required field` and the `Unique field`
  - Click the **"+ Add another field"** button
  - Click the **Relation** field
  - On the right side, click the **Category** dropdown and select, `Restaurant`
  - In the center, select the icon that represents `many-to-many`. The text should read, `Categories has and belongs to many Restaurants`
  - Click `Finish`
- Click the **Save** button and wait for Strapi to restart

## 5. Add content to "Restaurant" Collection Type

Navigate to [**COLLECTION TYPES** - **Restaurants**](http://localhost:1337/admin/plugins/content-manager/restaurant?source=content-manager), in the left-hand menu.

- Click on **+ Add New Restaurant** button. Type `Biscotte Restaurant` in the **Restaurant** field. Type `Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers.` into the **Description** field.
- Click **Save**.

You will see your restaurant listed in the entries.

## 6. Add categories to the "Category" Collection Type

Navigate to [**COLLECTION TYPES** - **Categories**](http://localhost:1337/admin/plugins/content-manager/category?source=content-manager).

- Click on **+ Add New Category** button. Type `French Food` in the **Category** field. Select `Biscotte Restaurant`, on the right from **Restaurant (0)**.
- Click **Save**.

You will see the **French Food** category listed in the entries.

- Click on **+ Add New Category** button. Type `Brunch` in the **Category** field. **DO NOT ADD IT HERE** to `Biscotte Restaurant`.
- Click **Save**.

You will see the **Brunch** category listed in the entries.

Navigate back to [**COLLECTION TYPES** - **Restaurants**](http://localhost:1337/admin/plugins/content-manager/restaurant?source=content-manager).

- Click on `Biscotte Restaurant`.
- On the right, under **Categories(1)**, `select` the `Add an item...`, and add **Brunch** as a category for this restaurant, and click the **Save** button.

You have now seen **two different ways** to use the **relation** field type to add and connect relations between Content Types.

## 7. Set Roles and Permissions

Navigate to [**PLUGINS** - **Roles & Permissions**](http://localhost:1337/admin/plugins/users-permissions/roles).

- Click the **Public** Role.
- Scroll down under **Permissions**, find **Restaurant**. Click the checkbox next to **find** and **findone**.
- Repeat and find **Category**. Click the checkbox next to **find** and **findone**.
- Click **Save**.

## 8. Consume the Collection Type's API

Here we are! The list of **restaurants** is accessible at [`http://localhost:1337/restaurants`](http://localhost:1337/restaurants).

::: tip CONGRATULATIONS
👏 Congratulations, you have now completed the **Strapi Quick Start**. Where to go next?

- Learn how to use Strapi with React ([Gatsby](https://blog.strapi.io/building-a-static-website-using-gatsby-and-strapi) or [Next.js](https://blog.strapi.io/strapi-next-setup/)) or Vue.js ([Nuxt.js](https://blog.strapi.io/cooking-a-deliveroo-clone-with-nuxt-vue-js-graphql-strapi-and-stripe-setup-part-1-7/)).
- Read the **concepts** and do the [Tutorial](quick-start-tutorial.md) to deep dive into Strapi.
- Get help on [Github Discussions](https://github.com/strapi/strapi/discussions).
- Read the [source code](https://github.com/strapi/strapi), [contribute](https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md) or [give a star](https://github.com/strapi/strapi) on GitHub.
- Follow us on [Twitter](https://twitter.com/strapijs) to get the latest news.
- [Join the vibrant and active Strapi community](https://slack.strapi.io) on Slack.
  :::
