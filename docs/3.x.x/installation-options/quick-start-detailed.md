# Quick start detailed

We have created an Quick Start installation which will set-up, configure and get Strapi up and running effortlessly.

This quick start (detailed version) is written for developers who prefer more detailed explanations when learning a new CMS. A more intermediate to advanced version is written and can be found at [Quick Start](/3.x.x/getting-started/quick-start.html) in the [Getting Started](/3.x.x/getting-started/quick-start.html) section.

(You should have already completed the steps to install Strapi and the requirements from [Installation Requirements](/3.x.x/getting-started/install-requirements.html). These steps continue after ensuring nodejs, NPM and strapi are all properly installed.)

This page explains how to create a new project in Strapi. Each step from creating a new project to creating content types ready to be consumed is covered. ([Check out our video tutorial](https://www.youtube.com/watch?v=yMl5IcFHA74)).

**Table of contents:**

1. [Create a project](#_1-create-a-project)
2. [Create an admin user](#_2-create-an-admin-user)
3. [Create a Content Type](#_3-create-a-content-type)

   - [Files structure](#files-structure)

4. [Manage and add data to Content Type](#_4-manage-and-add-data-to-content-type)
5. [Set roles and permissions](#_5-set-roles-and-permissions)
6. [Consume the Content Type API](#_6-consume-the-content-type-api)

   - [List entries (GET)](#list-entries-get)
   - [Get a specific entry (GET)](#get-a-specific-entry-get)
   - [Create data (POST)](#create-data-post)
   - [Update data (PUT)](#update-data-put)
   - [Delete data (DELETE)](#delete-data-delete)

---

## 1. Create a project

Navigate to your parent "projects" directory in your command line.

```bash
str@pi:~/Desktop/Strapi/Projects$
```

Type the following in your command line and press enter to create a Strapi Quick Start project.

```bash
str@pi:~/Desktop/Strapi/Projects$ strapi new my-project --quickstart
```

::: warning NOTE

When you create a new Quick Start project in Strapi, you will download all the node modules, the Strapi files necessary and the Strapi plugin files. THIS STEP CAN TAKE SEVERAL MINUTES DEPENDING ON YOUR INTERNET CONNECTION SPEED. Please wait for the process to complete before cancelling or trying to continue.

:::

You will see something like this:

```bash
str@pi:~/Desktop/Strapi/Projects$ strapi new my-project --quickstart
🚀 Start creating your Strapi application. It might take a minute, please take a coffee ☕️


⏳ Testing database connection...
The app has been connected to the database successfully!

🏗  Application generation:
✔ Copy dashboard
✔ Install plugin settings-manager.
✔ Install plugin content-type-builder.
✔ Install plugin content-manager.
✔ Install plugin users-permissions.
✔ Install plugin email.
✔ Install plugin upload.
✔ Link strapi dependency to the project.

👌 Your new application my-project is ready at /home/str/Desktop/Strapi/Projects/my-project.

⚡️ Change directory:
$ cd my-project

⚡️ Start application:
$ strapi start
```

The command will automatically create a Strapi app folder within your parent "projects" directory.

```bash
str@pi:~/Desktop/Strapi/Projects$ ls
my-project
```

This will open your default browser to the Welcome page for creating an admin user.

![Strapi Welcome Page for creating admin user](../assets/quick-start-detailed/strapi-welcome-screen.jpg 'Strapi Welcome Page for creating admin user')

::: warning NOTE
You can replace the "my-project" project name with any name you want.

---

Quick start will install Strapi using a SQLite database. ([SQLite](https://www.sqlite.org/index.html) is likely used more than all other database engines combined.)

:::

---

## 2. Create an admin user

The first user you create is the root user for your project. This user has all privileges and access rights. You will need to complete the following fields:

1. Username, create a username for login access to your project, eg. paulbocuse
2. Password, create a unique password for your project
3. Email Address, this will be used for recovery
4. Check receive news, this is optional but recommended
5. Click the "Ready to Start" button

![Example completed Welcome Screen with Admin User information](../assets/quick-start-detailed/welcome-screen-entered-information.jpg 'Example completed Welcome Screen with Admin User information')

---

After your admin user is registered, you will see the Strapi admin panel:

![Strapi Admin Panel](../assets/quick-start-detailed/AfterRegistrationScreenAdminPanel.jpg 'Strapi Admin Panel')

---

Every user is found by clicking in the left menu: **CONTENT TYPES** --> **Users**.

![Strapi Users Content Type Menu Item](../assets/quick-start-detailed/AfterRegistrationScreenAdminPanelChooseUsersMenu.jpg 'Strapi Users Content Type Menu Item')

From here you can add and edit users.

![Strapi Users Page](../assets/quick-start-detailed/AdminUserInUsers.jpg 'Strapi Users Page')

---

Now let's see how to [create a Content Type](#_3-create-a-content-type). Click on the **Strapi** logo (top left corner) to return the main administration panel.

---

## 3. Create a Content Type

At this point, your project is empty. You need to create a Content Type. We will use the **Content Type Builder** plugin.

Go to the **Content Type Builder** plugin, located in the left menu: **PLUGINS** --> **Content Type Builder**:

![Choose Content Type Item Location](../assets/quick-start-detailed/AfterRegistrationScreenAdminPanelChooseContentType.jpg 'Choose Content Type Item Location')

We will create two content types. We will create a content type for **Restaurant** and **Category**.

![Create Content Type Screen](../assets/quick-start-detailed/CreateContentTypeScreen.jpg 'Create Content Type Screen')

::: warning NOTE

Content Type _name_ is always **singular**. For example, **restaurant** not restaurants. For example, **catgeory** not categories.

:::

### The "Restaurant" Content Type

The "Restaurant" Content Type will have a **String Field** named **"Name"** for the restaurant name, and a **Text field** (with a WYSIWYG editor) named "Description" for the restaurant description.

Let's now add a content type. Click the **"Add Content Type"** button.

![Add Content Type Button](../assets/quick-start-detailed/AddContentTypeButton.jpg 'Add Content Type Button')

Now enter a name for your New Content Type (we will call this one **"restaurant"**), and write a **"Description"**. We will write **"Recommended Restaurants"** in the description.

::: warning NOTE

This description and name should be clear so you can tell it apart from other content types you may add later.
:::

Then click the **Save** button.

![Restaurant Name and Descriptions](../assets/quick-start-detailed/RestaurantNameAndDescription.jpg 'Restaurant Name and Descriptions')

Now you are ready to add the content type fields. We will add a **String Field** for the Name and a **Text Field** for a short Restaurant description. Click on the **"Add New Field"** button.

![Add Restaurant Fields](../assets/quick-start-detailed/restaurantAddFields.jpg 'Add Restaurant Fields')

Next we will click on the **"String Field"**.

![String Field](../assets/quick-start-detailed/restaurantStringAndText.jpg 'String Fields')

In the **"Base Settings"** tab, in the **"Name"** field, type **"Name"**. This will be the name of the restaurant.

![Input Restaurant Name Field](../assets/quick-start-detailed/saveRestaurantNameField.jpg 'Input Restaurant Name Field')

Now, click on the **"Advanced Settings"** tab, check **"Required field"** and **"Unique"**. This field is required for each restaurant and is not optional. Also, we want each restaurant to have a unique name, so we check the Unique field box. And then click the **"Continue"** button.

![Advanced Settings String Field](../assets/quick-start-detailed/restaurantAdvancedSettingsStringField.jpg 'Advanced Settings String Field')

We are now ready to add the second field, **"Text"** for the restaurant description. Click the **"Add New Field"** button.

![Add new restaurant field](../assets/quick-start-detailed/restaurantAddNewField.jpg 'Add new restaurant field')

From here, click the **"Text Field"**.

![Text Fields](../assets/quick-start-detailed/AddTextFieldRestaurant.jpg 'Text Fields')

In the **"Base Settings"** tab, in the **"Name"** field, type **"Description"**. This will be the description of the restaurant.

![Input Restaurant Description Field](../assets/quick-start-detailed/restaurantTextFieldBaseSettings.jpg 'Input Restaurant Description Field')

Now, click on the **"Advanced Settings"** tab, check **"Display as a WYSIWYG"**. This field will provide a rich text editor. And then click the **"Continue"** button.

![Advanced Settings Text Field](../assets/quick-start-detailed/restaurantTextFieldAdvancedSettings.jpg 'Advanced Settings Text Field')

Lastly, we will save this Content Type. Click the **"Save"** button.

![Save Restaurant Content Type](../assets/quick-start-detailed/saveRestaurantContentType.jpg 'Save Restaurant Content Type')

Wait for Strapi to restart, and then we will be able to create the next **"Category"** content type.

![Wait for Strapi Restart](../assets/quick-start-detailed/waitForRestart.jpg 'Wait for Strapi Restart')

### The "Category" Content Type

The "Category" Content Type will have a **String field** named **"Category"** for categories assigned to restaurants, and a **Relation field** with a **Many to Many** relationship.

Let's now add this second content type. Click the **+ Add Content Type** menu item.

![Add Content Type Menu Item](../assets/quick-start-detailed/AddContentTypeMenuItem.jpg 'Add Content Type Menu Item')

Now enter a name for this New Content Type (we will call this one **"category"**), and write a Description. We will write **"Restaurant Categories"** in the description. Then click the **Save** button.

![Category Content Type Name and Description](../assets/quick-start-detailed/categoryNameAndDescription.jpg 'Category Content Type Name and Description')

Now you are ready to add the content type fields. We will add a **String Field** for the Name and a **Relation Field** for creating a **Many to Many** relation between the Category Content Type and Restaurant Content Type. Click on the **"Add New Field"** button.

![Category Add New Field Button](../assets/quick-start-detailed/categoryAddNewField.jpg 'Category Add New Field Button')

Next we will click on the **"String Field"**.

![Category add String Field](../assets/quick-start-detailed/categoryAddStringField.jpg 'Category add String Field')

In the **"Base Settings"** tab, in the **"Name"** field, type **"Name"**. This will be the name of the category.

![Category String Field Name](../assets/quick-start-detailed/categoryStringNameField.jpg 'Category String Field Name')

Now, click on the **"Advanced Settings"** tab, check **"Required field"** and **"Unique"**. This field is required for each category and is not optional. Also, we want each category to have a unique name, so we check the Unique field box. And then click the **"Continue"** button.

![Category String Field Advanced Settings](../assets/quick-start-detailed/categoryStringAdvancedSettings.jpg 'Category String Field Advanced Settings')

We are now ready to add the second field, **"Relation"** for the **Many to Many relation** setting between Categories and Restaurants. Click the **"Add New Field"** button.

![Category Add New Field for Relation Field](../assets/quick-start-detailed/categoryAddClickNewFieldRelation.jpg 'Category Add New Field for Relation Field')

From here, click the **"Relation"** field.

![Category Click Relation Field](../assets/quick-start-detailed/clickRelationFieldCategory.jpg 'Category Click Relation Field')

This will bring you to the following screen. We will change two elements in this field.

![Add new Relation Field screen](../assets/quick-start-detailed/addNewRelationScreen.jpg 'Add new Relation Field screen')

The first element to change is **Permission (Users-Permissions)** to **Restaurant** (on the right).

![Change Permission to Restaurant](../assets/quick-start-detailed/categoryChangePermissionToRestaurant.jpg 'Change Permission to Restaurant')

The second element to change is to click the **Many to Many** icon (in the middle). It should now read, **"Categories has and belongs to many Restaurants"**. Then click the **"Continue"** button.

![Category Has Many To Many Relation](../assets/quick-start-detailed/categoryHasManyToMany.jpg 'Category Has Many To Many Relation')

Lastly, we will save this Content Type. Click the **"Save"** button.

![Now Save Category](../assets/quick-start-detailed/nowSaveCategory.jpg 'Now Save Category')

Wait for Strapi to restart.

![Now Wait for Strapi to Restart](../assets/quick-start-detailed/saveCategoryWaiting.jpg 'Now Wait for Strapi to Restart')

Verify in the left menu that you see **"Categories"**, **"Restaurants"** and **"Users"** under **"CONTENT TYPES"**.

![Verify Content Types](../assets/quick-start-detailed/verifyContentTypes.jpg 'Verify Content Types')

We are now ready to [manage and add data to the Content Types](quick-start-detailed.html#_4-manage-and-add-data-to-content-type) we just created.

::: warning NOTE
See the [CLI documentation](../cli/CLI.md#strapi-generateapi) for more information on how to add Content Types the hacker way.
:::

### Files structure

A new directory has been created in the `./api` folder of your application which contains all the needed files related to your `Restaurant` and `Category` Content Types: routes, controllers, services and models. Take a look at the [API structure documentation](../concepts/concepts.md#files-structure) for more information.

---

## 4. Manage and add data to Content Type

After creating [the Content Types](#_3-create-a-content-type), we now need to manage and add data/content to the new Content Types.

We will create a complete entry of a restaurant called, **"Strapi Restaurant"** with a description saying, **"Strapi restaurant is a cosy restaurant delivering one of the very fastest and nicest dining experiences in the world, combining nods to tradition with fierce modernity, warmth with daring."**. We will then assign two Categories, **"Italian"** and **"Contemporary"** to this restaurant.

Click on **"Restaurants"** under the **CONTENT TYPES** menu in order to **"Add New Restaurant"**.

![Add Restaurant to Content Type](../assets/quick-start-detailed/AddStrapiRestaurant.jpg 'Add Restaurant to Content Type')

Next click on the **"Add New Restaurant"** button (in the top right corner). GO ahead and add **"Strapi Restaurant"** to the **Name** field, and add the content (above) to the **Description** field. Then press the **"Save"** button (in the top right corner).

![Add Restaurant Name and Description](../assets/quick-start-detailed/addTheRestaurantData.jpg 'Add Restaurant Name and Description')

When it is properly saved, you will see your restaurant listed in the entries. From here you can edit it or add a new resturant.

![Restaurant is now listed](../assets/quick-start-detailed/ListedRestaurant.jpg 'Restaurant is now listed')

We have **NOT** added a **"Category"** to the **Restaurant** we created. We first have to add the actual Category items to the **Categories** content types. Click on **"Categories"** under the **CONTENT TYPES** menu on the left.

![Category Add Content Type Screen](../assets/quick-start-detailed/categoryContentTypeScreen.jpg 'Category Add Content Type Screen')

Now we will add each of the catgeories. First, let's add **"Italian"**. You will see **"Restaurants"** to the right. Select **"Strapi Restaurant"** to add this category to the restaurant. And then press the **"Save"** button.

![Add Italian category to Restaurant](../assets/quick-start-detailed/addItalianCategoryToRestaurant.jpg 'Add Italian category to Restaurant')

You now see the Category listed. Click the **"Add New Category"** to add the second category **"Contemporary"**.

![Listed Italian Category](../assets/quick-start-detailed/listedItalianCategory.jpg 'Listed Italian Category')

Now let's add **"Contemporary"**. You will see **"Restaurants"** to the right. Select **"Strapi Restaurant"** to add this category to the restaurant. And then press the **"Save"** button.

![Add Contemporary category to Restaurant](../assets/quick-start-detailed/addContemporaryCategoryToRestaurant.jpg 'Add Contemporary category to Restaurant')

You return to the **"Category"** Content Type page. You see both categories listed. Both have been assigned to the **"Restaurant"** we created earlier.

![Both categories listed](../assets/quick-start-detailed/categoriesListed.jpg 'Both categories listed')

::: warning NOTE

If you want to add Categories directly from the **"Restaurants"** Content Type, you simply click on the Restaurant and add, edit or change **EXISTING** categories. Otherwise, you can create and add new **"Categories"** from the **"Category Content Type"** as we did above.

![Select Category from Restaurant](../assets/quick-start-detailed/selectCategoryFromRestaurant.jpg 'Select Category from Restaurant')

:::

The next steps involve [setting roles and permissions](quick-start-detailed.html#_5-set-roles-and-permissions) for these content types. Let's do that. Click on the Strapi Logo to return to the main administration panel.

![Main Admin Panel](../assets/quick-start-detailed/mainAdminPanel.jpg 'Main Admin Panel')

---

## 5. Set roles and permissions

By default, Strapi publishes all Content Types with restricted permissions. Which means you have to explicitly give permissions to each Content Type you create. We are going to give **"Public"** (any web browser with the correct link) access to the **"Restaurant"** Content Type.

Locate and click on the **"Roles & Permission"** menu item under **"PLUGINS"** on the left menu. (The **"Roles & Permission"** plugin can accomplish many tasks related to permissions. For now we will focus on the **"Public"** role.) Next, click on the **pencil** edit icon to the right of the **"Public"** Role.

![Roles and Permissions Panel](../assets/quick-start-detailed/RolesAndPermissionsPanel.jpg 'Roles and Permissions Panel')

From here, scroll down under **"Permissions"** and find **"Restaurant"**. Click the checkbox next to **find**. To the right, you will see the URL route. It should say, `/restaurants"`. Scroll back to the top, and click the **"Save"** button.

![Check Find for Restaurant](../assets/quick-start-detailed/rolesFindAndRoute.jpg 'Check Find for Restaurant')

You are returned to the **Roles and Permission** Panel.

![Roles and Permissions Panel](../assets/quick-start-detailed/RolesAndPermissionsPanel.jpg 'Roles and Permissions Panel')

We are now ready to [Consume the Content Type API](quick-start-detailed.html#_6-consume-the-content-type-api).

---

## 6. Consume the Content Type API

The Project is accessible by following the `http://localhost:1337/` link. You will see the **'Welcome'** screen.

![Strapi Welcome Page](../assets/quick-start-detailed/strapiWelcomePage.jpg 'Strapi Welcome Page')

What we want is the **Restaurant Content Type**. The route is `/restaurants"`. In your browser, type `http://localhost:1337/restaurants`.

![Successful API call to Restaurant Content Type](../assets/quick-start-detailed/successApiCall.jpg 'Successful API call to Restaurant Content Type')

::: warning NOTE

If you have incorrectly or not set permissions to your content type, you will get a **"403"** permission error. See the below example.

Forbidden Access Looks like this:

![Forbidden Access to Restaurant Content Type](../assets/quick-start-detailed/forbiddenAccessToRestaurant.jpg 'Forbidden Access to Restaurant Content Type')

:::

::: tip CONGRATULATIONS
👏 Congratulations, you have now completed the Strapi Quick Start. We invite you to [join our community](/3.x.x/getting-started/community.html). Please continue reviewing our docs and tutorials to further learn how Strapi can solve your needs.
:::
