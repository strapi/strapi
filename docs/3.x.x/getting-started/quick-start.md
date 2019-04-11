# Quick Start Guide

Get ready to make Strapi up and running in **less than 5 minutes** 🚀

<div class="video-container">
   <iframe width="800" height="450" src="https://www.youtube.com/embed/nux0djdHmY8" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

*For a step-by-step guide, please take a look at the [detailed tutorial](quick-start-tutorial.html).*

## 1. Install Strapi globally

Please make sure [Node.js and npm are properly installed](install-requirements.html) on your machine.

```bash
npm install strapi@alpha -g
```

## 2. Create a new project

```bash
strapi new cms --quickstart
```

## 3. Create an admin user

Navigate to [**http://localhost:1337/admin**](http://localhost:1337/admin).

 - Fill in the form.
 - Click **Ready to start**.

## 4. Create a Content Type

Navigate to [**PLUGINS** - **Content Type Builder**](http://localhost:1337/admin/plugins/content-type-builder).

   - Click the **"+ Add Content Type"** button.
   - Enter `restaurant`.
   - Click **"+ Add New Field"**
      - Click the **String** field.
      - Type `name` under the **BASE SETTINGS** tab, in the **Name** field. 
      - Click **Continue**.
   - Click **"+ Add New Field"** 
      - Click the **Text** field.
      - Type `description` under the **BASE SETTINGS** tab, in the **Name** field. 
      - Click the **ADVANCED SETTINGS** tab, check **Display as a WYSIWYG**. 
      - Click **Continue**.
   - Click the **Save** button and wait for Strapi to restart.

## 5. Manage and add data to Content Type

Navigate to [**CONTENT TYPES** - **Restaurants**](http://localhost:1337/admin/plugins/content-manager/restaurant?source=content-manager).

   - Click on **+ Add New Restaurant** button. Type `Strapi Restaurant` in the **Name** field. Type `Strapi restaurant is a cosy restaurant delivering one of the very fastest and nicest dining experiences in the world, combining nods to tradition with fierce modernity, warmth with daring.` into the **Description** field. 
   - Click **Save**.

You will see your restaurant listed in the entries. 

## 6. Set roles and permissions

Navigate to [**PLUGINS** - **Roles & Permission**](http://localhost:1337/admin/plugins/users-permissions/roles).

   - Click the **pencil** edit icon to the right of the **Public** Role.
   - Scroll down under **Permissions**, find **Restaurant**. Click the checkbox next to **find**.
   - Click **Save**.

## 7. Consume the Content Type API

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
