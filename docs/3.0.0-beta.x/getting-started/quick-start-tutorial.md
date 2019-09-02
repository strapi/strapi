# Tutorial

This **tutorial** is written for developers to **teach and explain** the step-by-step introduction to Strapi. (A more concise **How-to** version can be found in the [Quick Start Guide](/3.0.0-beta.x/getting-started/quick-start.html).) This tutorial will take you through the beginning steps of how you start a project like **"FoodAdvisor"** ([Github](https://github.com/strapi/foodadvisor/))([Demo](https://foodadvisor.strapi.io/)). You will get a good overview of the features developers love about using Strapi.

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

- (Use **yarn** to install the Strapi project (**recommended**). [Install yarn with these docs](https://yarnpkg.com/lang/en/docs/install/).)

```bash
yarn create strapi-app my-project --quickstart
```

**or**

- (Use **npm/npx** to install the Strapi project.)

```bash
npx create-strapi-app my-project --quickstart
```

---

The command will create a Strapi project `my-project/` folder within your parent `Projects/` directory.

::: tip NOTE

When you create a new Quick Start(`--quickstart`) project, Strapi will download the node modules and the Strapi files needed. Using `--quickstart`, automatically completes an **additional** step of **building the administration panel** for Strapi and then **starting** Strapi for you.

:::

::: tip NOTE
You can replace the `my-project` name with any name you want. E.g. `yarn create strapi-app my-foodadvisor-project --quickstart`, will create a folder `./Projects/my-foodadvisor-project`.

:::

You will see something like this. This indicates your Strapi project is being downloaded and installed.

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

![Strapi Registration Page](../assets/getting-started/tutorial/strapi-beta-registration-page.png 'Strapi Registration Page')

::: tip NOTE
Using the `--quickstart` flag will install Strapi using a [SQLite](https://www.sqlite.org/index.html) database. You may always leave off the **--flag**, but you will simply need to follow a few configuration steps for a your database. **You will need to have your database choice installed and running locally, prior to creating your project.**

**Note:** An **SQLite** database is an excellent database to use for prototyping and _developing_ Strapi projects. **SQLite** is a light database that ports effortlessly to the other relational databases (**MySQL**, **PostgreSQL** and **MariaDB**). It is recommended to **develop** with SQLite and to use another relational database (MySQL, PostgreSQL or MariaDB) in production.

**Note:** If you would like to use **MongoDB** in production, you will need to [install, run and use MongoDB on your development machine](/3.0.0-beta.x/guides/databases.html#mongodb-installation).
:::

You are now ready to create a new **Administrator** and new front-end **User**.

## 2. Create an Adminstrator and front-end User

The first step is to create an **Administrator** (or "root user") for your project. An **Administrator** has all administrator privileges and access rights. You will need to complete the following fields:

- **Username**, create a username for login access to your project, eg. `paulbocuse`
- **Password**, create a unique password for logging into your project
- **Email address**, this will be used for recovery
- Check **Receive news**, this is optional but **recommended**
- Click the **Ready to Start** button

![Completed Registration Page](../assets/getting-started/tutorial/completed-registration-page.png 'Completed Registration Page')

After your **Administrator** registration is complete, you will see the Strapi _Administration Dashboard_:

![Strapi Admininstration Dashboard](../assets/getting-started/tutorial/strapi-dashboard.png 'Strapi Admin Dashboard')

**Administrators** and front-end **Users** are separate roles.

**A.** An **Administrator** has access and rights to the Administration Dashboard (or backend) of Strapi. **Administrators** have the ability to add content, add plugins, upload images, etc.

**B.** A front-end **User** is someone who interacts with your project through the front-end. A front-end **User** is someone who is the "Author" of an article, makes a purchase, has an account, leaves a review, leaves a comment, etc.

Up until this point, you have created an **Administrator**, now you will want to create a front-end **User**.

- Click on `Users` located under **CONTENT TYPES** in the left-hand menu
- Click the blue **+ Add New User** button in the top right corner
- Next, complete the `Username`, `Email`, and `Password` fields
- Select `ON` for the **Confirmed** toggle field
- To the right, under **Role**, select `Authenticated`
- Save the new user by clicked the blue **Save** button (top right)

![New front-end User](../assets/getting-started/tutorial/new-front-end-user.png 'New front-end User')

You are now ready to create your first **Content Type**.

## 3. Create a new Content Type called, "Restaurant"

**Content Types** are a collection of entered data represented by fields. For example, a **Content Type** called `restaurant` may be intended to display information regarding restaurants. A `restaurant` **Content Type** could have fields that includes a `name`, a main `image`, and a `description` - _at a minimum_. But a `restaurant` could also have a `category` or mulitple `categories`, and a `restaurant` could perhaps need to show `hoursOfOperation`.

A **Content Type** forms your data structure.

The next section of this tutorial will guide you through each of the steps needed for each of these above **Content Type** fields.

::: tip NOTE

Additional **Restaurant** themed **Content Types** can be seen in the [FoodAdvisor demo site](https://foodadvisor.strapi.io/).

:::

### The Restaurant Content Type

At this point, three Content Types are available `Permission`, `Role`, and `Users`.

Go to the **Content Type Builder** plugin, located in the left menu: **PLUGINS** --> **Content Type Builder**. You are now able to see the three available **Content Types**.

![Content Type Dashboard](../assets/getting-started/tutorial/content-type-dashboard.png 'Content Type Dashboard')

You will need to create a new **Content Type** for `Restaurants`.

1. Complete these steps to **Add a Content Type**:

- Click the `+ Add a Content Type` button
- Enter a **Name** for your new **Content Type** (call this `restaurant`), and you can write `Restaurant Listings` for the **Description**.
- Click the `Done` button

![Singular Name Entries for Content Type](../assets/getting-started/tutorial/singular-name-entry.png 'Singular Name Entries or Content Type')

::: tip NOTE

The Content Type **Name** is always **singular**. For example, `restaurant` not `restaurants`.

:::

2. You are now at the **Field Selection** panel:

You are now ready to add your first field, a **String** field for the **Restaurant** name.

![Field Section Panel](../assets/getting-started/tutorial/field-selection-panel.png 'Field Selection Panel')

- Click on the `String` field
- In the **Name** field, type `Restaurant`. This will be the name of the restaurant.

![Restaurant Name Input Field](../assets/getting-started/tutorial/restaurant-name-input-field.png 'Restuarant Name Input Field')

- Click on the `ADVANCED SETTINGS` tab
- Check the `Required field` checkbox
- Check the `Unique field` checkbox

![Restaurant Name Advanced Settings](../assets/getting-started/tutorial/restaurant-name-advanced-settings.png 'Restuarant Name Advanced Settings')

- Click the `+ Add Another Field` button

You are now ready to add the second field, a **Rich Text** field for the **Restaurant** description.

![Field Section Panel](../assets/getting-started/tutorial/field-selection-panel.png 'Field Selection Panel')

- Click the `Rich Text` field

- In the **Name** field, type `Description`. This will be the description of the **Restaurant**.

![Restaurant Rich Text Field](../assets/getting-started/tutorial/restaurant-rich-text-field.png 'Restuarant Rich Text Field')

- Click the `+ Add Another Field` button

You are now ready to add the third field, a **Media** field for the **Restaurant** thumbnail image.

![Field Section Panel](../assets/getting-started/tutorial/field-selection-panel.png 'Field Selection Panel')

- Click the `Media` field

- In the **Name** field, type `Image`

![Restaurant Rich Image Field](../assets/getting-started/tutorial/restaurant-image-field.png 'Restuarant Rich Image Field')

- Click on the **ADVANCED SETTINGS** tab
- Check the `Required field` checkbox

![Restaurant Rich Image Field Advanced Settings](../assets/getting-started/tutorial/restaurant-image-field-advanced-settings.png 'Restuarant Rich Image Field Advanced Settings')

- Click the `Done` button

Your new Content Type called **Restaurant** is ready to be `Saved`.

![Restaurant Save Screen](../assets/getting-started/tutorial/restaurant-save-screen.png 'Restuarant Save Screen')

- Click the `Save` button

- Wait for Strapi to restart

![Strapi Restart](../assets/getting-started/tutorial/strapi-restart.png 'Strapi Restart')

After Strapi has restarted, you are ready continue to create the `Category` **Content Type**.

## 4. Create a new Content Type called, "Category"

### The Category Content Type

(The `category` **Content Type** will have a **String** field named `category`, and a **Relation field** with a **Many to Many** relationship.)

![Category Add Content Type](../assets/getting-started/tutorial/category-add-content-type.png 'Category Add Content Type')

1. Complete these steps to **add a new Content Type**:

- Click the `+ Add Content Type` link to add a new **Content Type**.
- Enter a **Name** for your new **Content Type** (call this `category`), and you can write `Restaurant Categories` for the **Description**.

![Category Name Field](../assets/getting-started/tutorial/category-name-field.png 'Category Name Field')

- Click the `Done` button.

2. Now, you are ready to add fields to your **Category**:

![Category Fields](../assets/getting-started/tutorial/category-fields.png 'Category Fields')

- Click on the `String` field.
- In the **Name** field, type `Category`. This will be the name of the category.

![Category Name Entry Field](../assets/getting-started/tutorial/category-name-entry-field.png 'Category Name Entry Fields')

- Click on the `ADVANCED SETTINGS` tab
- Check the `Required field` checkbox
- Check the `Unique field` checkbox

![Category Advanced Settings](../assets/getting-started/tutorial/category-advanced-settings.png 'Category Advanced Settings')

- Click the `+ Add Another Field` button

You are now ready to add the second field, a **Relation** field for creating a **Many to Many** relationship between the **Category** and **Restaurant** Content Types.

- Click on the `Relation` field.

![Category Add Field Panel](../assets/getting-started/tutorial/category-add-field-panel.png 'Category Add Field Panel')

This will bring you to the **Add New Relation** screen.

![Category New Relation Field](../assets/getting-started/tutorial/category-new-relation-field.png 'Category New Relation Field')

- Click on _right dropdown_ with `Permission (Users-Permissions)` and change it to `Restaurant`.

![Category Relation Dropdown](../assets/getting-started/tutorial/category-relation-dropdown.png 'Category Relation Dropdown')

- Click the `Many to Many` icon (from the middle icon choices). It should now read, **"Categories has and belongs to many Restaurants"**.

- Click the `Done` button.

![Category Relation Many to Many](../assets/getting-started/tutorial/category-relation-many-to-many.png 'Category Relation Many to Many')

- Click the `Save` button.

![Category Save](../assets/getting-started/tutorial/category-save.png 'Category Save')

- Wait for Strapi to restart.

![Category Save Strapi Restart](../assets/getting-started/tutorial/category-save-strapi-restart.png 'Category Save Strapi Restart')

After Strapi has restarted, you are ready to create a `Group and Repeatable Field` called, **"Hours of Operations"**.

## 5. Create a new Group and Repeatable Field called, "Hours of Operation"

### The Hours of Operation Group

( The `Restaurant` Content Type will have a **Group** field named `Hoursofoperation`. This Group will be repeatable for displaying the **Opening hours** and **Closing Hours** of a **Restaurant**.)

1. Complete these steps to **add a new Group**:

- Click the `+ Add A Group` link to add a new **Group**.
- Enter a **Name** for your new **Group** (call this `hoursofoperation`), and you can write `Restaurant Hours of Operation` for the **Description**.

![Hours of Operation Add Group](../assets/getting-started/tutorial/hours-of-operation-add-group.png 'Hours of Operation Add Group')

- Click the `Done` button

2. Now, you are ready to add fields to your **Group**:

![Hours of Operation Add Fields](../assets/getting-started/tutorial/hours-of-operation-add-fields.png 'Hours of Operation Add Fields')

- Click on the `String` field
- In the **Name** field, type `day_interval`. The will be to enter the **Day (or Days)** with **Hours**.

![Hours of Operation Days](../assets/getting-started/tutorial/hours-of-operation-days.png 'Hours of Operation Days')

- Click on the `ADVANCED SETTINGS` tab
- Check the `Required field` checkbox

![Hours of Operation Days Advanced Settings](../assets/getting-started/tutorial/hours-of-operation-days-advanced-settings.png 'Hours of Operation Days Advanced Settings')

- Click the `+ Add Another Field`

You are now ready to add a second field, another **String** field for the **Opening Hours**.

![Hours of Operation Opening Hours](../assets/getting-started/tutorial/hours-of-operation-opening-hours.png 'Hours of Operation Opening Hours')

- Click on the `String` field
- In the **Name** field, type `opening_hours`. This will be the time the **Restaurant** opens.

![Hours of Operation Opening Hours Name](../assets/getting-started/tutorial/hours-of-operation-opening-hours-name.png 'Hours of Operation Opening Hours Name')

- Click the `+ Add Another Field` button

You are now ready to add a third field, another **String** field for the **Closing Hours**.

![Hours of Operation Closing Hours](../assets/getting-started/tutorial/hours-of-operation-closing-hours.png 'Hours of Operation Closing Hours')

- Click on the `String` field
- In the **Name** field, type `closing_hours`. This will be the time the **Restaurant** opens.
- Click the `Done` button.

![Hours of Operation Closing Hours Name](../assets/getting-started/tutorial/hours-of-operation-closing-hours-name.png 'Hours of Operation Closing Hours Name')

- Click the `Save` button.

![Hours of Operation Save](../assets/getting-started/tutorial/hours-of-operation-save.png 'Hours of Operation Save')

- Wait for Strapi to restart.

![Hours of Operation Strapi Restart](../assets/getting-started/tutorial/hours-of-operation-strapi-restart.png 'Hours of Operation Strapi Restart')

After Strapi has restarted, you are ready to assign this **Hoursofoperation** Group to the **Restaurant** Content Type.

3. Next, you need to assign the **Hoursofoperation** Group to the **Restaurant** Content Type.

In order to access the **Hoursofoperation** Group from within the **Restaurant** Content Type, you need to **edit** the **Restaurant** Content Type in the **Content Type Builder**.

- Click on the `Restaurant` Content Type, under **CONTENT TYPES** in the **Content Type Builder**.

![Edit Restaurant Content Type](../assets/getting-started/tutorial/edit-restaurant-content-type.png 'Edit Restaurant Content Type')

- Click the `+ Add Another Field` button, to add the **Group**.

![Edit Restaurant Add Another Field](../assets/getting-started/tutorial/edit-restaurant-add-another-field.png 'Edit Restaurant Add Another Field')

- Click on the `Group` field

![Edit Restaurant Group Field](../assets/getting-started/tutorial/edit-restaurant-group-field.png 'Edit Restaurant Group Field')

- Ensure `hoursofoperation` is displayed in the **Select a group** dropdown.
- Provide a **name** for this group in the **Restaurant** Content Type. E.g. `RestaurantHours`
- Check the `Repeatable field` box

![Restaurant Group Inputs](../assets/getting-started/tutorial/restaurant-group-inputs.png 'Restaurant Group Inputs')

- Click on the `ADVANCED SETTINGS` tab
- Check the `Required field` checkbox
- Click the `Done` button

![Restaurant Group Advanced Settings](../assets/getting-started/tutorial/restaurant-group-advanced-settings.png 'Restaurant Group Advanced Settings')

- Click the `Save` button

![Restaurant Group Save](../assets/getting-started/tutorial/restaurant-group-save.png 'Restaurant Group save')

- Wait for Strapi to restart.

![Restaurant Group Strapi Restart](../assets/getting-started/tutorial/restaurant-group-strapi-restart.png 'Restaurant Group Strapi Restart')

After Strapi has restarted, you are ready to continue to the next section where you will customize the user-interface your **Restaurant** Content Type.

4. Next you will edit the **View Settings** for the new **Hoursofoperation** Group from within the **Content Manager**.

You have the ability to _drag and drop_ fields into a different layout, as well as, _rename the labels_ as two examples of how you can customize the user interface for your **Content Types**.

- Click on the `Content Manager`, under **PLUGINS** in the left-hand menu

![Content Manager](../assets/getting-started/tutorial/content-manager.png 'Content Manager')

- Click on the `Groups(1)` tab

![Content Manager Groups Tab](../assets/getting-started/tutorial/content-manager-groups-tab.png 'Content Manager Groups Tab')

- Click on `Hoursofoperation` to modify the **View Settings**

![Content Manager Hoursofoperation](../assets/getting-started/tutorial/content-manager-hoursofoperation.png 'Content Manager Hoursofoperation')

- Grab the `opening_hours` and slide it next to `closing_hour`. This will rearrange the fields and make them more user friendly.

![Content Manager Hoursofoperation Rearrange Fields](../assets/getting-started/tutorial/content-manager-hoursofoperation-rearrange-fields.png 'Content Manager Hoursofoperation Rearrange Fields')

Next, you will change the **field labels** to make them easier to understand:

- Click on the `day_interval` field
- Edit the **Label** to read, `Day (or Days)`
- Add a **Description**, `You can type in one day or a series of days to complete this field. E.g. "Tuesday" or "Tues - Wed"`.

![Content Manager Hoursofoperation Day Interval](../assets/getting-started/tutorial/content-manager-hoursofoperation-day-interval.png 'Content Manager Hoursofoperation Day Interval')

- Click on the `opening_hour` field
- Edit the **Label** to read, `Opening Hours`

![Content Manager Hoursofoperation Opening Hours](../assets/getting-started/tutorial/content-manager-hoursofoperation-day-opening-hours.png 'Content Manager Hoursofoperation Day Opening Hours')

- Click on `closing_hour` field
- Edit the **Label** to read, `Closing Hours`

![Content Manager Hoursofoperation Closing Hours](../assets/getting-started/tutorial/content-manager-hoursofoperation-day-closing-hours.png 'Content Manager Hoursofoperation Day Closing Hours')

- Click the `Save` button, and then the `Confirm` button to save your settings.

Your settings have now been saved. You are ready to start inputting actual content.

## 6. Manage and add content to, "Restaurant" Content Type

## 7. Set Roles and Permissions

By default, Strapi publishes all **Content Types** with restricted permissions. Which means you have to explicitly give permissions to each **Content Type** you create. You are going to give **Public** API (or URL) access to both the **Restaurant** Content Type and **Category** Content Type.

- Click on the `Roles & Permissions` menu item, under **PLUGINS** in the left-hand-menu.
  Locate and click on the **Roles & Permissions** menu item under **PLUGINS** on the left menu.

![Roles and Permissions](../assets/getting-started/tutorial/roles-and-permissions.png 'Roles And Permissions')

- Next, click on the **Public** Role.

![Roles and Permissions Public Role](../assets/getting-started/tutorial/roles-and-permissions-public-role.png 'Roles And Permissions Public Role')

- From here, scroll down to under **Permissions** and locate the **Restaurant** and **Category** Content Types
- Click the checkbox for **find** and **findone** in the **Restaurant** Content Type.
- Click the checkbox for **find** and **findone** in the **Category** Content Type.

![Roles and Permissions Find Permissions](../assets/getting-started/tutorial/roles-and-permissions-find-permissions.png 'Roles And Permissions Find Permissions')

- Scroll back to the top, and click the **Save** button.

![Roles and Permissions Save](../assets/getting-started/tutorial/roles-and-permissions-save.png 'Roles And Permissions Save')

You have now opened the API and are ready to consume your content.

## 8. Consume the Content Type API

Each of your **Content Types** are accessible by following their automatically generated routes.

Both your **Restaurant** and **Category** Content Types can now be accessed:

- In your browser, follow `http://localhost:1337/restaurants` to return the data for the allowed **Find** value for your **Restaurant** Content Type.

** TO DO ADD PHOTO **

- In your browser, follow `http://localhost:1337/categories` to return the data for the allowed **Find** value for your **Category** Content Type.

::: tip NOTE

If you have incorrectly or not set permissions to your content type, you will get a **"403"** permission error. See the below example.

Forbidden Access Looks like this:

![Forbidden Access to Restaurant Content Type](../assets/getting-started/tutorial/permission-forbidden-access.png 'Forbidden Access to Restaurant Content Type')
:::

::: tip NOTE

If you would like to see the route of any specific **Content Type**, you will need to navigate to the **Content Type** under the **Roles and Permissions** plugin and click the ⚙️ next to the value. On the right, you will see the route:

![Permission Routes](../assets/getting-started/tutorial/permission-routes.png 'Permission Routes')

:::

::: tip CONGRATULATIONS
👏 Congratulations, you have now completed the **Strapi Quick Start Tutorial**. Where to go next?

- Learn how to use Strapi with React ([Gatsby](https://blog.strapi.io/building-a-static-website-using-gatsby-and-strapi) or [Next.js](https://blog.strapi.io/strapi-next-setup/)) or Vue.js ([Nuxt.js](https://blog.strapi.io/cooking-a-deliveroo-clone-with-nuxt-vue-js-graphql-strapi-and-stripe-setup-part-1-7/)).
- Read the [concepts](../concepts/concepts.html) and [articles](../articles/) to deep dive into Strapi.
- Get help on [StackOverflow](https://stackoverflow.com/questions/tagged/strapi).
- Read the [source code](https://github.com/strapi/strapi), [contribute](https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md) or [give a star](https://github.com/strapi/strapi) on GitHub.
- Follow us on [Twitter](https://twitter.com/strapijs) to get the latest news.
- [Join the vibrant and active Strapi community](https://slack.strapi.io) on Slack.
  :::

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
