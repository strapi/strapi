# Quick start

We have created an Quick Start installation which will set-up, configure and get Strapi up and running effortlessly.

::: warning NOTE
Quick start will install Strapi using a SQLite database. [SQLite](https://www.sqlite.org/index.html) is likely used more than all other database engines combined.
:::

This quick start is written for developers who prefer an intermediate or more advanced introduction to Strapi. A more detailed version of this Quick Start page can be found at [Quick Start - Detailed](/3.x.x/installation-options/quick-start-detailed.html) in the **Installation Options** section.

(You should have already completed the steps to install Strapi and the requirements from [Installation Requirements](install-requirements.html). These steps continue after [ensuring nodejs, NPM and strapi are all properly installed](/3.x.x/getting-started/install-requirements.html#check-installation)).)

This page explains how to create a new project in Strapi. ([Check out our video tutorial](https://www.youtube.com/watch?v=yMl5IcFHA74)).

## 1. Create a project

Navigate to your parent "projects" directory in your command line. Enter the following command to create a Strapi Quick Start project.

```bash
str@pi:~/Desktop/Strapi/Projects$ strapi new my-project --quickstart
```

This will open your default browser to the Welcome page for creating an admin user.

::: warning NOTE
You can replace the "my-project" project name with any name you want. Strapi will create a folder within your "projects" directory using that name.

:::

::: warning NOTE

Quick start will install Strapi using a SQLite database. ([SQLite](https://www.sqlite.org/index.html) is likely used more than all other database engines combined.)

:::

## 2. Create an admin user

The first user you create is the root user for your project. This user has all privileges and access rights. You will need to complete the following fields:

1. Username, create a username for login access to your project, eg. paulbocuse
2. Password, create a unique password for your project
3. Email Address, this will be used for recovery
4. Check receive news, this is optional but recommended
5. Click the "Ready to Start" button

---

After your admin user is registered, you will see the Strapi admin panel.

::: warning NOTE
Every user is found by clicking in the left menu: **Content Type --> Users**. From here you can add and edit users.
:::

Now let's see how to [create a Content Type](#_3-create-a-content-type). Next, click on the **Strapi** logo (top left corner) to return the main administration panel.

---

## 3. Create a Content Type

At this point, your project is empty. You need to create a **Content Type**. We will use the **Content Type Builder** plugin.

Create a new content type is done by clicking in the left menu: **PLUGINS** --> **Content Type Builder**. Go ahead a click on **Content Type Builder** to continue to the next steps.

We will create two content types. We will create a content type called **"Restaurant"** and one called **"Category"**.

### The Restaurant Content Type

The Restaurant Content Type will have a **String** field named **Name** for the restaurant name, and a **Text** field (with a WYSIWYG editor) named "Description" for the restaurant description.

1. Let's now add a content type:

   Click the **"+ Add Content Type"** button.

   Now enter a "Name" for your New Content Type (we will call this one **"restaurant"**), and below write a "description". We will write **"Recommended Restaurants"** for the description.

   Then click the **Save** button.

::: warning NOTE

Content Type name is always **singular**. For example, **restaurant** not restaurants. For example, **category** not categories.

:::

::: warning NOTE

This **"name"** should be clear so you can tell it apart from other content types you may add later. This will be what you see listed in the backend panel.
:::

2. Now you are ready to add the content type fields. We will add a **String** field for the Name and a **Text** field for a short Restaurant description.

   The **Name** field

   Click on the **"+ Add New Field"** button.

   Next we will click on the **String** field.

   You should be under the **BASE SETTINGS** tab, in the **Name** field, type **"Name"**. This will be the name of the restaurant.

   Now, click on the **ADVANCED SETTINGS** tab, check **Required field** and **Unique field**. This field is required for each restaurant and is not optional. Also, we want each restaurant to have a unique name, so we check the **Unique field** box.

   And then click the **Continue** button.

3. We are now ready to add the second field, **Text** for the restaurant description.

   The **Text** field

   Click the **"+ Add New Field"** button.

   From here, click the **Text** field.

   You should be under the **BASE SETTINGS** tab, in the **Name** field, type **"Description"**. This will be the description of the restaurant.

   Now, click on the **ADVANCED SETTINGS** tab, check **"Display as a WYSIWYG"**. This field will provide a rich text editor.

   And then click the **Continue** button.

4. Lastly, we will save this Content Type. Click the **Save** button.

5. Wait for Strapi to restart, and then we will be able to create the next **Category** content type.

### The Category Content Type

The Category Content Type will have a **String** field named **Category** for categories assigned to restaurants, and a **Relation field** with a **Many to Many** relationship.

1. Let's now add this second content type:

   Click the **+ Add Content Type** menu item.

   Now enter a name for this New Content Type (we will call this one **"category"**), and write a Description. We will write **"Restaurant Categories"** for the description.

   Then click the **Save** button.

2. Now you are ready to add the content type fields. We will add a **String** field for the Name and a **Relation Field** for creating a **Many to Many** relation between the Category Content Type and Restaurant Content Type.

   The **Name** Field

   Click on the **"+ Add New Field"** button.

   Next we will click on the **String** field.

   You should be under the **BASE SETTINGS** tab, in the **Name** field, type **"Name"**. This will be the name of the category.

   Now, click on the **ADVANCED SETTINGS** tab, check **Required field** and **Unique field**. This field is required for each category and is not optional. Also, we want each category to have a unique name, so we check the **Unique field** box.

   And then click the **Continue** button.

3. We are now ready to add the second field, the **Relation** field for the **Many to Many relation** setting between Categories and Restaurants.

   The **Relation** Field

   Click the **"+ Add New Field"** button.

   From here, click the **Relation** field.

   This will bring you to the **Add New Relation** screen. We will change two elements on this page for the **Relation** field.

   The first element to change is **Permission (Users-Permissions)** to **Restaurant** (on the right).

   The second element to change is to click the **Many to Many** icon (in the middle). It should now read, **"Categories has and belongs to many Restaurants"**.

   Then click the **Continue** button.

4. Lastly, we will save this Content Type. Click the **Save** button.

5. Wait for Strapi to restart.

Verify in the left menu under **CONTENT TYPES**, that you see **Categories**, **Restaurants** and **Users**.

We are now ready to [manage and add data to the Content Types](#_4-manage-and-add-data-to-content-type) we just created.

Next, click on the **Strapi** logo (top left corner) to return the main administration panel.

::: warning NOTE
See the [CLI documentation](../cli/CLI.md#strapi-generateapi) for more information on how to add Content Types the hacker way.
:::

### Files structure

A new directory has been created in the `./api` folder of your application which contains all the needed files related to your `restaurant` and `category` Content Types: routes, controllers, services and models. Take a look at the [API structure documentation](../concepts/concepts.md#files-structure) for more information.

---

## 4. Manage and add data to Content Type

After creating [the Content Types](#_3-create-a-content-type), we now need to manage and add data/content to the new Content Types.

### Add data to Content Type

1. We will create an entry of a restaurant called, **"Strapi Restaurant"** with a description saying, **"Strapi restaurant is a cosy restaurant delivering one of the very fastest and nicest dining experiences in the world, combining nods to tradition with fierce modernity, warmth with daring."**.

   Click on **Restaurants** under the **CONTENT TYPES** menu in order to **Add New Restaurant**.

   Next click on the **+ Add New Restaurant** button (in the top right corner). Go ahead and type **"Strapi Restaurant"** in the **Name** field, and type the content (above) into the **Description** field.

   Then press the **Save** button (in the top right corner).

2. When it is properly saved, you will see your restaurant listed in the entries. From here you can edit it or add a new resturant.

We have **NOT** added a **Category** to the **Restaurant** we created. We first have to add the actual Category items to the **Categories** content type.

3. We will next assign two Categories, **"Italian"** and **"Contemporary"** to this restaurant.

   Click on **Categories** under the **CONTENT TYPES** menu on the left.

   Now we will add each of the catgeories. First, let's add **"Italian"**.

   Click the **+ Add New Category** button to add the first category **Italian**.

   Type **"Italian"** into the **Name** field.

   Next, you will see **Restaurants (0)** to the right. Select **Strapi Restaurant** to add this category to the restaurant.

   And then press the **Save** button.

   You now see the **Italian** Category listed.

   Now let's add **Contemporary**.

   Click the **+ Add New Category** button to add the second category **Contemporary**.

   Type **"Contemporary"** into the **Name** field.

   You will see **Restaurants (0)** to the right. Select **Strapi Restaurant** to add this category to the restaurant.

   And then press the **Save** button.

You return to the **Category** Content Type page. You see both categories listed. Both have been assigned to the **Restaurant** we created earlier.

::: warning NOTE

If you want to add Categories directly from the **Restaurants** Content Type, you simply click on the Restaurant and add, edit or change **EXISTING** categories. Otherwise, you can create and add new **Categories** from the **Category Content Type** as we did above.

:::

The next steps involve [setting roles and permissions](#_5-set-roles-and-permissions) for these content types. Let's do that.

Click on the Strapi Logo to return to the main administration panel.

---

## 5. Set roles and permissions

By default, Strapi publishes all Content Types with restricted permissions. Which means you have to explicitly give permissions to each Content Type you create.

1. We are going to give **Public** (any web browser with the correct link) access to the **Restaurant** Content Type.

   Locate and click on the **Roles & Permission** menu item under **PLUGINS** on the left menu.

   (The **Roles & Permission** plugin can accomplish many tasks related to permissions. For now we will focus on the **Public** role.)

   Next, click on the **pencil** edit icon to the right of the **Public** Role.

   From here, scroll down under **Permissions** and find **Restaurant**.

   Click the checkbox next to **find**. To the right, you will see the URL route. It should say, `/restaurants"`.

   Scroll back to the top, and click the **Save** button.

2. You are returned to the **Roles and Permission** Panel.

We are now ready to [Consume the Content Type API](#_6-consume-the-content-type-api).

Click on the Strapi Logo to return to the main administration panel.

---

## 6. Consume the Content Type API

The Project is accessible by following the `http://localhost:1337/` link. You will see the **'Welcome'** screen.

What we want is the **Restaurant Content Type**. The route is `/restaurants"`. In your browser, type `http://localhost:1337/restaurants`.

::: warning NOTE

If you have incorrectly or not set permissions to your content type, you will get a **"403"** permission error.

:::

::: tip CONGRATULATIONS
👏 Congratulations, you have now completed the Strapi Quick Start. We invite you to [join our community](/3.x.x/getting-started/community.html). Please continue reviewing our docs and tutorials to further learn how Strapi can solve your needs.
:::
