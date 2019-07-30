# Tutorial

This Tutorial is written for developers who prefer a more detailed step-by-step introduction. (A less detailed version can be found at [Quick Start Guide](/3.0.0-beta.x/getting-started/quick-start.html).) This tutorial will take you through the beginning steps of how you could start a project like "FoodAdvisor" ([Github](https://github.com/strapi/foodadvisor/))([Demo](https://foodadvisor.strapi.io/)). You will get a good overview of many of the features that developers love about using Strapi.

**[TODO: Create NEW Video]**

By following this tutorial, you will install install and create your first Strapi project.

::: tip NOTE

You need to have **_Node.js and npm_** installed on your system prior to following these steps. If you do not have Node.js and npm installed or are not sure, please visit our [Installation Requirements](/3.0.0-beta.x/getting-started/install-requirements.html).
:::

**Table of contents:**

1. [Install Strapi and create project](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_1-install-strapi-and-create-project)
2. [Create an Administrator and front-end user](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_2-create-an-adminstrator-and-front-end-user)
3. [Create a new Content Type called, "Restaurant"](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_3-create-a-new-content-type-called-restaurant)
4. [Create a new Content Type Called, "Category"](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_4-create-a-new-content-type-called-category)
5. [Create a new Group and Repeatable Field called, "Hours of Operations"](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_5-create-a-new-group-and-repeatable-field-called-hours-of-operations)
6. [Manage and add content to, "Restaurant" Content Type](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_6-manage-and-add-content-to-restaurant-content-type)
7. [Set Roles and Permissions](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_7-set-roles-and-permissions-consume-the-content-type-api)
8. [Consume the Content Type API](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_8-consume-the-content-type-api)

## 1. Install Strapi and create project

Navigate to your parent `Projects/` directory from your command line. Use the following command to create a new Strapi project.

Path: `~/Desktop/Projects/`

(Using **yarn** to install the Strapi project (**recommended**). [Install yarn with these docs](https://yarnpkg.com/lang/en/docs/install/).)

```bash
yarn create strapi-app my-project
```

(Using **npm/npx** to install the Strapi project.)

```bash
npx create-strapi-app my-project
```

The command will automatically create a Strapi project `my-project/` folder within your parent `Projects/` directory.

::: tip NOTE

When you create a new Quick Start(`--quickstart`) project in Strapi, you will automatically download the node modules and the Strapi files needed. Using `--quickstart`, completes an additional step of building the administration panel for Strapi and starting Strapi automatically for you.

Please wait for the process to complete before cancelling or trying to continue.

:::

::: tip NOTE
You can replace the `my-project` name with any name you want. E.g. `strapi new my-foodadvisor-project --quickstart`, this creates a folder `./Projects/my-foodadvisor-project`.

:::

You will see something like this, indicating the your Strapi project is being downloaded and installed.

```bash
yarn create v1.17.3
[1/4] 🔍  Resolving packages...
[2/4] 🚚  Fetching packages...
[3/4] 🔗  Linking dependencies...
[4/4] 🔨  Building fresh packages...
success Installed "create-strapi-app@3.0.0-beta.14" with binaries:
      - create-strapi-app
[#####################################################################] 71/71Creating a new Strapi application at /Users/paulbocuse/Desktop/Projects/my-project.

Creating a quickstart project.
Creating files.
Dependencies installed successfully.

Your application was created at /Users/paulbocuse/Desktop/Projects/my-project.

Available commands in your project:

  yarn develop
  Start Strapi in watch mode.

  yarn start
  Start Strapi without watch mode.

  yarn build
  Build Strapi admin panel.

  yarn strapi
  Display all available commands.

You can start by doing:

  cd /Users/paulbocuse/Desktop/Projects/my-project
  yarn develop

Running your Strapi application.

```

Next, you will notice the following commands that build your Strapi administration panel and automatically start Strapi:

```bash
> my-project@0.1.0 develop /Users/paulbocuse/Desktop/Projects/my-project
> strapi develop

Building your admin UI with development configuration ...

✔ Webpack
  Compiled successfully in 52.21s

[2019-07-30T15:21:17.698Z] info File created: /Users/paulbocuse/Desktop/Projects/my-project/extensions/users-permissions/config/jwt.json
[2019-07-30T15:21:17.701Z] info The server is restarting

[2019-07-30T15:21:19.037Z] info Time: Tue Jul 30 2019 17:21:19 GMT+0200 (Central European Summer Time)
[2019-07-30T15:21:19.037Z] info Launched in: 910 ms
[2019-07-30T15:21:19.038Z] info Environment: development
[2019-07-30T15:21:19.038Z] info Process PID: 70615
[2019-07-30T15:21:19.038Z] info Version: 3.0.0-beta.14 (node v10.16.0)
[2019-07-30T15:21:19.038Z] info To shut down your server, press <CTRL> + C at any time

[2019-07-30T15:21:19.038Z] info ☄️  Admin panel: http://localhost:1337/admin
[2019-07-30T15:21:19.039Z] info ⚡️ Server: http://localhost:1337

```

**[TODO: Add an updated image of the new user registration page]**

::: tip NOTE
Using the `--quickstart` flag will install Strapi using a [SQLite](https://www.sqlite.org/index.html) database. You may leave off the flag, but will need to follow the configuration steps for a different database. **You will need to have your database choice installed and running locally prior to creating your project.**

**Note:** An **SQLite** database is an excellent database to use for prototyping and developing Strapi projects. The reason is that it is a light way database that ports effortlessly to other relational databases that Strapi supports such as **MySQL**, **PostgreSQL** and **MariaDB**. However, if you would like to use **MongoDB** in production, you will need to [install, run and use MongoDB on your development machine](/3.0.0-beta.x/guides/databases.html#mongodb-installation).
:::

You are now ready to create a new **Administrator** and new front-end **User**.

## 2. Create an Adminstrator and front-end User

The first user you create is the root user for your project. This user has all administrator privileges and access rights. You will need to complete the following fields:

1. **Username**, create a username for login access to your project, eg. `paulbocuse`
2. **Password**, create a unique password for your project
3. **Email address**, this will be used for recovery
4. Check **Receive news**, this is optional but **recommended**
5. Click the **Ready to Start** button

**[TODO: Add a image for the completed Adminstrator registration form]**

After your admin user is registered, you will see the Strapi admin panel:

**[TODO: Add an image of the Strapi Adminstration Dashboard]**

The next step is to create a front-end user. **Administrators** and front-end **Users** are separate roles.

- An **Administrator** has access and rights to the backend of Strapi. They have the ability to add content, add plugins, upload images, etc. An **Adminstrator** does **not** author or have any relation to actual content.
- A front-end **User** is someone who interacts with your project through the front-end. A front-end **User** is someone who authors an article, makes a purchase, has an account, leaves a review, leaves a comment, etc.

At this point, you have created an **Administrator**, now you will need to create a front-end **User**.

Click on `Users` located under **CONTENT TYPES** in the left-hand menu.

- Click the blue **+ Add New User** button in the top right corner.
- Next, complete the `Username`, `Email`, and `Password` fields.
- Select `ON` for the **Confirmed** toggle field.
- To the right, under **Role**, select `Authenticated`.

**[TODO: Add an image showing entered user]**

You are now ready to create your first Content Type.

## 3. Create a new Content Type called, "Restaurant"

## 4. Create a new Content Type Called, "Category"

## 5. Create a new Group and Repeatable Field called, "Hours of Operations"

## 6. Manage and add content to, "Restaurant" Content Type

## 7. Set Roles and Permissions

## 8. Consume the Content Type API

Strapi is now installed globally on your computer. Type `strapi -h` in your command line to access available Strapi commands.

```bash
strapi -h

## You will get the following available commands
Usage: strapi [options] [command]

Options:
  -v, --version                                  output the version number
  -h, --help                                     output usage information

Commands:
  version                                        output your version of Strapi
  console                                        open the Strapi framework console
  new [options] [name]                           create a new application
  start                                          Start your Strapi application
  develop|dev [options]                          Start your Strapi application in development mode
  generate:api [options] <id> [attributes...]    generate a basic API
  generate:controller [options] <id>             generate a controller for an API
  generate:model [options] <id> [attributes...]  generate a model for an API
  generate:policy [options] <id>                 generate a policy for an API
  generate:service [options] <id>                generate a service for an API
  generate:plugin [options] <id>                 generate a basic plugin
  build                                          Builds the strapi admin app
  install [plugins...]                           install a Strapi plugin
  uninstall [options] [plugins...]               uninstall a Strapi plugin
  help                                           output the help
```

## 4. Create a new Content Type

**Content Types** are a collection of entered data represented by fields. For example, a **Content Type** called `restaurant` may be intended to display information regarding restaurants. A `restaurant` could have a `name`, a main `image`, a `description`, maybe even a link to the `restaurant menu`.

Another example, could be a **Content Type** called `menu` which is made up of `menu items`. These could have a `name`, `description of the menu item`, an `image` and perhaps even a `list of ingredients`.

::: tip NOTE

More **Restaurant** themed **Content Types** can be seen in the Strapi demo site: [Strapi Foodadvisor](https://foodadvisor.strapi.io/).

:::

At this point, your project is empty. You need to create a new **Content Type**.

Go to the **Content Type Builder** plugin, located in the left menu: **PLUGINS** --> **Content Type Builder**.

You will create two content types. You will create a content type called `Restaurant` and another called `Category`.

![Create Content Type Screen](../assets/quick-start-detailed/CreateContentTypeScreen.png 'Create Content Type Screen')

::: tip NOTE

Content Type `name` is always **singular**. For example, `restaurant` not `restaurants`. For example, `category` not `categories`.

:::

### The Restaurant Content Type

The Restaurant Content Type will have a **String** field for the restaurant name, and a **Text** field (with a **WYSIWYG editor**) for the restaurant description.

1. Now add a new **Content Type**.

Click the **"+ Add Content Type"** button.

Now enter a **Name** for your new **Content Type** (call this `restaurant`), and you can write `Restaurant Listings` for the **Description**.

Then click the **Save** button.

![Restaurant Name and Descriptions](../assets/quick-start-detailed/RestaurantNameAndDescription.png 'Restaurant Name and Descriptions')

2. Now you are ready to add the Content Type fields. Add a **String** field for the **Restaurant** name and a **Text** field for a **Restaurant description**.

![Add Restaurant Fields](../assets/quick-start-detailed/restaurantAddFields.png 'Add Restaurant Fields')

Next, click on the **String** field.

You should be under the **BASE SETTINGS** tab, in the **Name** field, type `Restaurant`. This will be the name of the restaurant.

![Input Restaurant Name Field](../assets/quick-start-detailed/saveRestaurantNameField.png 'Input Restaurant Name Field')

Now, click on the **ADVANCED SETTINGS** tab, check **Required field** and **Unique field**. This field is required for each restaurant and is not optional. Also, each restaurant is to have a unique name, so check the **Unique field** box. And then click the **Continue** button.

![Advanced Settings String Field](../assets/quick-start-detailed/restaurantAdvancedSettingsStringField.png 'Advanced Settings String Field')

You are now ready to add the second field, **Text** for the restaurant description. Click the **+ Add New Field** button.

![Add new restaurant field](../assets/quick-start-detailed/restaurantAddNewField.png 'Add new restaurant field')

From here, click the **Text** field.

![Text Fields](../assets/quick-start-detailed/AddTextFieldRestaurant.png 'Text Fields')

You should be under the **BASE SETTINGS** tab, in the **Name** field, type `Description`. This will be the description of the restaurant.

![Input Restaurant Description Field](../assets/quick-start-detailed/restaurantTextFieldBaseSettings.png 'Input Restaurant Description Field')

Now, click on the **ADVANCED SETTINGS** tab, check **Display as a WYSIWYG**. This field will provide a rich text editor.

And then click the **Continue** button.

![Advanced Settings Text Field](../assets/quick-start-detailed/restaurantTextFieldAdvancedSettings.png 'Advanced Settings Text Field')

Lastly, click the **Save** button.

![Save Restaurant Content Type](../assets/quick-start-detailed/saveRestaurantContentType.png 'Save Restaurant Content Type')

Wait for Strapi to restart, and then continue to create the `Category` **Content Type**.

![Wait for Strapi Restart](../assets/quick-start-detailed/waitForRestart.png 'Wait for Strapi Restart')

### The Category Content Type

The Category Content Type will have a **String** field named `category`, and a **Relation field** with a **Many to Many** relationship.

Now add this second content type. Click the **+ Add Content Type** menu item.

![Add Content Type Menu Item](../assets/quick-start-detailed/AddContentTypeMenuItem.png 'Add Content Type Menu Item')

Now enter a name for this new **Content Type** (call this one `category`), and write a Description. We will write `Restaurant Categories` for the description. Then click the **Save** button.

![Category Content Type Name and Description](../assets/quick-start-detailed/categoryNameAndDescription.png 'Category Content Type Name and Description')

Now you are ready to add the content type fields. Next, add a **String** field for the Name and a **Relation Field** for creating a **Many to Many** relation between the Category Content Type and Restaurant Content Type.

Next, click on the **String** field.

![Category add String Field](../assets/quick-start-detailed/categoryAddStringField.png 'Category add String Field')

You should be under the **BASE SETTINGS** tab, in the **Name** field, type `Catgeory`. This will be the name of the category.

![Category String Field Name](../assets/quick-start-detailed/categoryStringNameField.png 'Category String Field Name')

Now, click on the **ADVANCED SETTINGS** tab, check **Required field** and **Unique field**. This field is required for each category and is not optional. Also, each category to have a unique name, so check the **Unique field** box. And then click the **Continue** button.

![Category String Field Advanced Settings](../assets/quick-start-detailed/categoryStringAdvancedSettings.png 'Category String Field Advanced Settings')

You are now ready to add the second field, the **Relation** field for the **Many to Many relation** setting between Categories and Restaurants. Click the **+ Add New Field** button.

From here, click the **Relation** field.

![Category Click Relation Field](../assets/quick-start-detailed/clickRelationFieldCategory.png 'Category Click Relation Field')

This will bring you to the **Add New Relation** screen. You will change two elements on this page for the **Relation** field.

![Add new Relation Field screen](../assets/quick-start-detailed/addNewRelationScreen.png 'Add new Relation Field screen')

First, click on **Permission (Users-Permissions)** and change it to **Restaurant** (on the right side).

![Change Permission to Restaurant](../assets/quick-start-detailed/categoryChangePermissionToRestaurant.png 'Change Permission to Restaurant')

The second element to change is to click the **Many to Many** icon (in the middle). It should now read, **"Categories has and belongs to many Restaurants"**. Then click the **Save** button.

![Category Has Many To Many Relation](../assets/quick-start-detailed/categoryHasManyToMany.png 'Category Has Many To Many Relation')

Lastly, you will save this **Content Type**. Click the **Save** button.

![Now Save Category](../assets/quick-start-detailed/nowSaveCategory.png 'Now Save Category')

Wait for Strapi to restart.

![Now Wait for Strapi to Restart](../assets/quick-start-detailed/waitForRestart.png 'Now Wait for Strapi to Restart')

### Files structure

A new directory has been created in the `./Projects/my-project/` folder of your application which contains all the needed files related to your `restaurant` and `category` Content Types. (You may take a look at the [API structure documentation](../concepts/concepts.md#files-structure) for more information.)

## 5. Add content to each Content Type

Now you can add content to the new Content Types.

Click on **Restaurants** under the **CONTENT TYPES** menu in order to **Add New Restaurant**.

![Add Restaurant to Content Type](../assets/quick-start-detailed/AddStrapiRestaurant.png 'Add Restaurant to Content Type')

Next click on the **+ Add New Restaurant** button (in the top right corner). Go ahead and type `Strapi Restaurant` in the **Name** field, with a description saying, `Strapi restaurant is a cosy restaurant delivering one of the very fastest and nicest dining experiences in the world, combining nods to tradition with fierce modernity, warmth with daring.` into the **Description** field. Then press the **Save** button..

![Add Restaurant Name and Description](../assets/quick-start-detailed/addTheRestaurantData.png 'Add Restaurant Name and Description')

When it is saved, you will see your restaurant listed in the entries. From here you can edit it or add a new restaurant.

![Restaurant is now listed](../assets/quick-start-detailed/listedRestaurant.png 'Restaurant is now listed')

You have **NOT** yet added a **Category** to the **Restaurant** that was created. You first have to add the actual Category items to the **Categories** content type.

You will then assign two Categories, `Convenient` and `Time Saving` to this restaurant.

Click on **Categories** under the **CONTENT TYPES** menu on the left.

![Category Add Content Type Screen](../assets/quick-start-detailed/categoryContentTypeScreen.png 'Category Add Content Type Screen')

Click the **+ Add New Category** button to add the first category **Convenient**. Type `Convenient` into the **Name** field. Next, you will see **Restaurants (0)** to the right. Select **Strapi Restaurant**, to add this category to the restaurant.

After selecting, **Restaurants (0)** to the right, it will change to **Restaurants (1)**. And then press the **Save** button.

![Add Convenient category to Restaurant](../assets/quick-start-detailed/addItalianCategoryToRestaurant.png 'Add Convenient category to Restaurant')

You now see the Category listed. Click the **+ Add New Category** button to add the second category `Time Saving`.

![Listed Convenient Category](../assets/quick-start-detailed/listedItalianCategory.png 'Listed Convenient Category')

Now let's add **Time Saving**. Type `Time Saving` into the **Category** field. Go ahead and save it **WITHOUT** adding it to the **Strapi Restaurant** field.

![Add Time Saving category to Restaurant](../assets/quick-start-detailed/addContemporaryCategoryToRestaurant.png 'Add Time Saving category to Restaurant')

You return to the **Category** Content Type page. You see both categories listed. Both have been assigned to the **Restaurant** you created earlier.

![Both categories listed](../assets/quick-start-detailed/categoriesListed.png 'Both categories listed')

::: tip NOTE

If you want to add Categories directly from the **Restaurants** Content Type, you simply click on the Restaurant and add, edit or change **EXISTING** categories. Otherwise, you can create and add new **Categories** from the **Category Content Type** as you did above.

Go ahead and add `Time Saving`, the `Strapi Restaurant`.

![Select Category from Restaurant](../assets/quick-start-detailed/selectCategoryFromRestaurant.png 'Select Category from Restaurant')

:::

## 6. Set roles and permissions

By default, Strapi publishes all **Content Types** with restricted permissions. Which means you have to explicitly give permissions to each **Content Type** you create. You are going to give **Public** API (or URL) access to the **Restaurant** Content Type.

Locate and click on the **Roles & Permissions** menu item under **PLUGINS** on the left menu. (The **Roles & Permissions** plugin can accomplish many tasks related to permissions. For now, focus on the **Public** role.)

Next, click on the **Public** Role.

![Roles and Permissions Panel](../assets/quick-start-detailed/rolesAndPermissions.png 'Roles and Permissions Panel')

From here, scroll down under **Permissions** and find **Restaurant** and **Category**. Click the checkbox next to **find** and **findone** for each of them. Scroll back to the top, and click the **Save** button.

![Check Find for Restaurant](../assets/quick-start-detailed/rolesFindAndRoute.png 'Check Find for Restaurant')

## 7. Consume the Content Type API

The project is accessible by following the `http://localhost:1337/` link. You will see the **'Welcome'** screen.

![Strapi Welcome Page](../assets/quick-start-detailed/strapiWelcomePage.png 'Strapi Welcome Page')

What you want is the **Restaurant Content Type**. The route is `/restaurants`. In your browser, type `http://localhost:1337/restaurants`.

![Successful API call to Restaurant Content Type](../assets/quick-start-detailed/successApiCall.png 'Successful API call to Restaurant Content Type')

::: tip NOTE

If you have incorrectly or not set permissions to your content type, you will get a **"403"** permission error. See the below example.

Forbidden Access Looks like this:

![Forbidden Access to Restaurant Content Type](../assets/quick-start-detailed/forbiddenAccessToRestaurant.png 'Forbidden Access to Restaurant Content Type')

:::

::: tip CONGRATULATIONS
👏 Congratulations, you have now completed the Strapi Quick Start Tutorial. Where to go next?

- Learn how to use Strapi with React ([Gatsby](https://blog.strapi.io/building-a-static-website-using-gatsby-and-strapi) or [Next.js](https://blog.strapi.io/strapi-next-setup/)) or Vue.js ([Nuxt.js](https://blog.strapi.io/cooking-a-deliveroo-clone-with-nuxt-vue-js-graphql-strapi-and-stripe-setup-part-1-7/)).
- Read the [concepts](../concepts/concepts.html) and [articles](../articles/) to deep dive into Strapi.
- Get help on [StackOverflow](https://stackoverflow.com/questions/tagged/strapi).
- Read the [source code](https://github.com/strapi/strapi), [contribute](https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md) or [give a star](https://github.com/strapi/strapi) on GitHub.
- Follow us on [Twitter](https://twitter.com/strapijs) to get the latest news.
- [Join the vibrant and active Strapi community](https://slack.strapi.io) on Slack.
  :::
