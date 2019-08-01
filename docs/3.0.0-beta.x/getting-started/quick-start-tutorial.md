# Tutorial

This Tutorial is written for developers who prefer a more detailed step-by-step introduction. (A less detailed version can be found at [Quick Start Guide](/3.0.0-beta.x/getting-started/quick-start.html).) This tutorial will take you through the beginning steps of how you could start a project like "FoodAdvisor" ([Github](https://github.com/strapi/foodadvisor/))([Demo](https://foodadvisor.strapi.io/)). You will get a good overview of many of the features that developers love about using Strapi.

**[TODO: Create NEW Video]**

By following this tutorial, you will install and create your first Strapi project.

::: tip NOTE

You need to have **_Node.js and npm_** installed on your system prior to following these steps. If you do not have Node.js and npm installed (or are not sure), please visit our [Installation Requirements](/3.0.0-beta.x/getting-started/install-requirements.html).

:::

**Table of Contents**

1. [Install Strapi and create project](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_1-install-strapi-and-create-project)
2. [Create an Administrator and front-end User](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_2-create-an-adminstrator-and-front-end-user)
3. [Create a new Content Type called, "Restaurant"](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_3-create-a-new-content-type-called-restaurant)
4. [Create a new Content Type called, "Category"](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_4-create-a-new-content-type-called-category)
5. [Create a new Group and Repeatable Field called, "Hours of Operations"](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_5-create-a-new-group-and-repeatable-field-called-hours-of-operations)
6. [Manage and add content to the "Restaurant" Content Type](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_6-manage-and-add-content-to-restaurant-content-type)
7. [Set Roles and Permissions](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_7-set-roles-and-permissions-consume-the-content-type-api)
8. [Consume the Content Type API](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_8-consume-the-content-type-api)

## 1. Install Strapi and create project

- Navigate to your parent `Projects/` directory from your command line.

Path: `~/Desktop/Projects/`

Use **only one** of the following commands to create a new Strapi project:

---

- (Using **yarn** to install the Strapi project (**recommended**). [Install yarn with these docs](https://yarnpkg.com/lang/en/docs/install/).)

```bash
yarn create strapi-app my-project
```

**or**

- (Using **npm/npx** to install the Strapi project.)

```bash
npx create-strapi-app my-project
```

---

The command will create a Strapi project `my-project/` folder within your parent `Projects/` directory.

::: tip NOTE

When you create a new Quick Start(`--quickstart`) project, Strapi will download the node modules and the Strapi files needed. Using `--quickstart`, automatically completes an additional step of building the administration panel for Strapi and then starting Strapi for you.

:::

::: tip NOTE
You can replace the `my-project` name with any name you want. E.g. `strapi new my-foodadvisor-project --quickstart`, will create a folder `./Projects/my-foodadvisor-project`.

:::

You will see something like this, indicating your Strapi project is being downloaded and installed.

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

Next, you will notice the following that builds your Strapi administration panel and automatically starts up Strapi:

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
Using the `--quickstart` flag will install Strapi using a [SQLite](https://www.sqlite.org/index.html) database. You may always leave off the **--flag**, but you will simply need to follow a few configuration steps for a your database. **You will need to have your database choice installed and running locally, prior to creating your project.**

**Note:** An **SQLite** database is an excellent database to use for prototyping and _developing_ Strapi projects. **SQLite**å is a light database that ports effortlessly to the other relational databases that Strapi supports (**MySQL**, **PostgreSQL** and **MariaDB**). However, if you would like to use **MongoDB** in production, you will need to [install, run and use MongoDB on your development machine](/3.0.0-beta.x/guides/databases.html#mongodb-installation).
:::

You are now ready to create a new **Administrator** and new front-end **User**.

## 2. Create an Adminstrator and front-end User

The first step is to create an **Administrator** (or "root user") for your project. An **Administrator** has all administrator privileges and access rights. You will need to complete the following fields:

- **Username**, create a username for login access to your project, eg. `paulbocuse`
- **Password**, create a unique password for logging into your project
- **Email address**, this will be used for recovery
- Check **Receive news**, this is optional but **recommended**
- Click the **Ready to Start** button

**[TODO: Add a image for the completed Adminstrator registration form]**

After your **Administrator** registration is complete, you will see the Strapi _Administration Dashboard_:

**[TODO: Add an image of the Strapi Adminstration Dashboard]**

**Administrators** and front-end **Users** are separate roles.

**A.** An **Administrator** has access and rights to the backend of Strapi. They have the ability to add content, add plugins, upload images, etc. An **Adminstrator** does **not** author or have any relation to actual content.

**B.** A front-end **User** is someone who interacts with your project through the front-end. A front-end **User** is someone who authors an article, makes a purchase, has an account, leaves a review, leaves a comment, etc.

At this point, you have created an **Administrator**, now you will need to create a front-end **User**.

- Click on `Users` located under **CONTENT TYPES** in the left-hand menu.
- Click the blue **+ Add New User** button in the top right corner.
- Next, complete the `Username`, `Email`, and `Password` fields.
- Select `ON` for the **Confirmed** toggle field.
- To the right, under **Role**, select `Authenticated`.
- Save the new user by clicked the blue **Save** button (top right).

**[TODO: Add an image showing entered user]**

You are now ready to create your first **Content Type**.

## 3. Create a new Content Type called, "Restaurant"

**Content Types** are a collection of entered data represented by fields. For example, a **Content Type** called `restaurant` may be intended to display information regarding restaurants. A `restaurant` **Content Type** could have fields that includes a `name`, a main `image`, and a `description` - _at a minimum_. But a `restaurant` could also have a `category` or mulitple `categories`, and a `restaurant` could perhaps need to show `hoursOfOperation`.

The next section of this tutorial will guide you through each of the steps needed for each of these **Content Type** fields.

::: tip NOTE

Additional **Restaurant** themed **Content Types** can be seen in the [FoodAdvisor demo site](https://foodadvisor.strapi.io/).

:::

At this point, the only Content Type available is `Users`. You need to create a new **Content Type** for `Restaurants`.

### The Restaurant Content Type

Go to the **Content Type Builder** plugin, located in the left menu: **PLUGINS** --> **Content Type Builder**.

**[TODO: Add an image of the Add Content Type dashboard]**

1. Complete these steps to **add a new Content Type**:

- Click the **"+ Add Content Type"** button to add a new **Content Type**.
- Enter a **Name** for your new **Content Type** (call this `restaurant`), and you can write `Restaurant Listings` for the **Description**.
- Click the **Save** button.

**[TODO: Add an image of the entry form showing a singular NAME]**

::: tip NOTE

Content Type **Name** is always **singular**. For example, `restaurant` not `restaurants`.

:::

Now, you are ready to add the **Content Type** fields.

2. The following steps add a **String** field for the **Name** of the **Restaurant**:

**[TODO: Add an image of Add New Field form]**

You are now at the screen to add fields for your **Restaurant Content Type**.

- Click on the **String** field.
- In the **Name** field, type `Restaurant`. This will be the name of the restaurant.

**[TODO: Add an image of Input String Field image]**

You are under the **BASE SETTINGS** tab, for adding a new **String** type called, `Restaurant`.

- Click on the **ADVANCED SETTINGS** tab.
- Check the **Required field** which means, _"This field is required for each restaurant and is not optional"_.
- Check the **Unique field**, which means, _"Each restaurant is to have a unique name"_.
- Click the **Continue** button.

**[TODO: Add an image of Input String ADVANCED SETTINGS]**

You are now ready to add the second field, a **Text** field for the **Restaurant** description.

- Click the **+ Add New Field** button.

**[TODO: Add an image of the added Name field and to add a new TEXT field]**

- Click the **Text** field.

**[TODO: Add an image of the add a new TEXT field dialog box of fields]**

- In the **Name** field, type `Description`. This will be the description of the **Restaurant**.

**[TODO: Add an image of the add a new TEXT field to add DESCRIPTION]**

You are under the **BASE SETTINGS** tab, for adding a new **Text** type called, `Description`.

- Click on the **ADVANCED SETTINGS** tab.
- Check **Display as a WYSIWYG**. This field will provide a rich text editor.
- Click the **Continue** button.

**[TODO: Add an image of the Advanced Settings Text Field]**

- Click the **Save** button.

**[TODO: Add an image of Save Restaurant Image]**

- Wait for Strapi to restart.

**[TODO: Add an image of the SAVING OF STRAPI wait]**

After Strapi has restarted, you are ready continue to create the `Category` **Content Type**.

## 4. Create a new Content Type called, "Category"

### The Category Content Type

(The `category` **Content Type** will have a **String** field named `category`, and a **Relation field** with a **Many to Many** relationship.)

**[TODO: Add an image of the Add Content Type Menu Item]**

1. Complete these steps to **add a new Content Type**:

- Click the **"+ Add Content Type"** button to add a new **Content Type**.
- Enter a **Name** for your new **Content Type** (call this `category`), and you can write `Restaurant Categories` for the **Description**.
- Click the **Save** button.

**[TODO: Add an image of the Category Content Type Name and Description]\***

Now, you are ready to add the content type fields.

2. The following steps add a **String** field for the **Name** of the **Category**:

[TODO: Add an image of Add New Field form for Category]

You are now at the screen to add fields for your **Category Content Type**.

- Click on the **String** field.
- In the **Name** field, type `Category`. This will be the name of the category.

[TODO: Add an image of Input String Field image for category]

You are under the **BASE SETTINGS** tab, for adding a **String** type called, `Category`.

- Click on the **ADVANCED SETTINGS** tab.
- Check the **Required field** which means, "This field is required for each category and is not optional".
- Check the **Unique field**, which means, "Each category is to have a unique name".
- Click the **Continue** button.

[TODO: Add an image of Input String ADVANCED SETTINGS]

You are now ready to add the second field, a **Relation** field for creating a **Many to Many** relationship between the **Category Content Type** and **Restaurant Content Type**.

- Click the **+ Add New Field** button.

[TODO: Add an image of the added Name field and to add a new Relation field]

- Click on the **Relation** field.

[TODO: Add an image of the add a new TCategory Click Relation Field]

This will bring you to the **Add New Relation** screen.

[TODO: Add an image of the add a new Add new Relation Field screen]

- Click on _right dropdown_ with **Permission (Users-Permissions)** and change it to **Restaurant**.

[TODO: Add an image of the add a new Change Permission to Restaurant]

- Click the **Many to Many** icon (in the middle). It should now read, **"Categories has and belongs to many Restaurants"**.
- Click the **Save** button.

[TODO: Add an image of the add a new Category Has Many To Many Relation]

- Click the **Save** button.

[TODO: Add an image of the add Now Save Category]

- Wait for Strapi to restart.

[TODO: Add an image of the waiting to finish saving]

After Strapi has restarted, you are ready continue to create a `Group and Repeatable Field` called, **"Hours of Operations"**.

## 5. Create a new Group and Repeatable Field called, "Hours of Operations"

## 6. Manage and add content to, "Restaurant" Content Type

### Files structure

A new directory has been created in the `./Projects/my-project/` folder of your application which contains all the needed files related to your `restaurant` and `category` Content Types. (You may take a look at the [API structure documentation](../concepts/concepts.md#files-structure) for more information.)

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
