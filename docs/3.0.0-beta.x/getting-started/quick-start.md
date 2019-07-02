# Quick Start Guide

Get ready to get Strapi up and running in **less than 5 minutes** 🚀

<div class="video-container">
<iframe width="853" height="480"  src="https://www.youtube.com/embed/_qlLobVjd9k" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

_For a step-by-step guide, please take a look at the [detailed tutorial](quick-start-tutorial.html)._

## 1. Install Strapi globally

Please make sure [Node.js and npm are properly installed](install-requirements.html) on your machine.

```bash
npm install strapi@beta -g
```

## 2. Create a new project

```bash
strapi new my-project --quickstart
```

## 3. Create an Administrator user

Navigate to [**http://localhost:1337/admin**](http://localhost:1337/admin).

- Complete the form to create the first Administrator user.
- Click **Ready to start**.

## 4. Create a new Content Type

Navigate to [**PLUGINS** - **Content Type Builder**](http://localhost:1337/admin/plugins/content-type-builder), in the left-hand menu.

- Click the **"+ Add Content Type"** button.
- Enter `restaurant`.
- Click **"+ Add New Field"**
  - Click the **String** field.
  - Type `restaurant` under the **BASE SETTINGS** tab, in the **Name** field.
  - Check `Required field` and `Unique field` under the **ADVANCED SETTINGS** tab.
  - Click **Continue**.
- Click **"+ Add New Field"**
  - Click the **Text** field.
  - Type `description` under the **BASE SETTINGS** tab, in the **Name** field.
  - Click the **ADVANCED SETTINGS** tab, check **Display as a WYSIWYG**.
  - Click **Continue**.
- Click the **Save** button and wait for Strapi to restart.

## 5. Create another new Content type

Navigate back to [**PLUGINS** - **Content Type Builder**](http://localhost:1337/admin/plugins/content-type-builder), in the left-hand menu.

- Click the **"+ Add Content Type"** button.
- Enter `category`.
- A window opens with fields options:
  - Click the **String** field.
  - Type `category` under the **BASE SETTINGS** tab, in the **Name** field.
  - Check `Required field` and `Unique field` under the **ADVANCED SETTINGS** tab.
  - Click **Continue**.
- In the field options window:
  - Click the **Relation Field** field.
  - On the right side, click the **Permissions** dropdown and select, `Restaurant`.
  - In the center, select the icon the represents `many-to-many`. The text should read, `Categories has and belongs to Many Restaurants`.
  - Click **Save**.
- Click the **Save** button and wait for Strapi to restart.

## 6. Add content to "Restaurant" Content Type

Navigate to [**CONTENT TYPES** - **Restaurants**](http://localhost:1337/admin/plugins/content-manager/restaurant?source=content-manager).

- Click on **+ Add New Restaurant** button. Type `Strapi Restaurant` in the **Restaurant** field. Type `Strapi restaurant is a cosy restaurant delivering one of the very fastest and nicest dining experiences in the world, combining nods to tradition with fierce modernity, warmth with daring.` into the **Description** field.
- Click **Save**.

You will see your restaurant listed in the entries.

## 7. Add categories to the "Category" Content Type

Navigate to [**CONTENT TYPES** - **Categories**](http://localhost:1337/admin/plugins/content-manager/category?source=content-manager).

- Click on **+ Add New Category** button. Type `Convenient` in the **Category** field. Select `Strapi Restaurant`, on the right, from **Restaurant (0)**
- Click **Save**.

You will see the **Convenient** category listed in the entries.

- Click on **+ Add New Category** button. Type `Time Saving` in the **Category** field. **DO NOT ADD IT HERE** to `Strapi Restaurant`.
- Click **Save**.

You will see the **Time Saving** category listed in the entries.

Navigate back to [**CONTENT TYPES** - **Restaurants**](http://localhost:1337/admin/plugins/content-manager/restaurant?source=content-manager).

- Click on `Strapi Restaurant`
- On the right, under **Categories(1)**, `select` the `Add an item...`, and add **Time Saving** as a category for this restaurant.

You have now seen **two different ways** to use the **relation** field type to add and connect relations between content types.

## 8. Set roles and permissions

Navigate to [**PLUGINS** - **Roles & Permissions**](http://localhost:1337/admin/plugins/users-permissions/roles).

- Click the **Public** Role.
- Scroll down under **Permissions**, find **Restaurant**. Click the checkbox next to **find** and **findone**.
- Repeat and scroll down under **Permissions**, find **Category**. Click the checkbox next to **find** and **findone**.
- Click **Save**.

## 9. Consume the Content Type's API

Here we are! The list of **restaurants** is accessible at [`http://localhost:1337/restaurants`](http://localhost:1337/restaurants).

::: tip CONGRATULATIONS
👏 Congratulations, you have now completed the Strapi Quick Start. Where to go next?

- Learn how to use Strapi with React ([Gatsby](https://blog.strapi.io/building-a-static-website-using-gatsby-and-strapi) or [Next.js](https://blog.strapi.io/strapi-next-setup/)) or Vue.js ([Nuxt.js](https://blog.strapi.io/cooking-a-deliveroo-clone-with-nuxt-vue-js-graphql-strapi-and-stripe-setup-part-1-7/)).
- Read the [concepts](../concepts/concepts.html) and [articles](../articles/) to deep dive into Strapi.
- Get help on [StackOverflow](https://stackoverflow.com/questions/tagged/strapi).
- Read the [source code](https://github.com/strapi/strapi), [contribute](https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md) or [give a star](https://github.com/strapi/strapi) on GitHub.
- Follow us on [Twitter](https://twitter.com/strapijs) to get the latest news.
- [Join the vibrant and active Strapi community](https://slack.strapi.io) on Slack.
  :::
