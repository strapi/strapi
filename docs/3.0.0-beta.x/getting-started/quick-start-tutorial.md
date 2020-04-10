# Tutorial

This **tutorial** is written for developers to **teach and explain** a step-by-step introduction to Strapi. (The [Quick Start Guide](quick-start.md) is a more concise **How-to** version.) This tutorial takes you through the beginning steps of how you start a project like **"FoodAdvisor"** ([Github](https://github.com/strapi/foodadvisor/))([Demo](https://foodadvisor.strapi.io/)).

You get a good overview of the features found in Strapi that developers love.

<iframe width="800" height="450" src="https://www.youtube.com/embed/vulcVRQ4X8A" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

By following this tutorial, you install and create your first Strapi project.

::: tip NOTE

You need to have **_Node.js and npm_** installed on your system before following these steps. If you do not have Node.js and npm installed (or are not sure), please visit our [installation requirements](install-requirements.md).

:::

**Table of Contents**

[[toc]]

## 1. Install Strapi and create a project

Navigate to your parent `Projects/` directory from your command line.

::: tip NOTE

In this tutorial, the example assumes a **Projects** folder on your **Desktop**. However, this is not required, and you may put your project where you want.

:::

**Path —** `~/Desktop/Projects/`

Use **only one** of the following commands to create a new Strapi project

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

The command creates a Strapi project `my-project/` folder within your parent `Projects/` directory.

::: tip NOTE

When you create a new Quick Start(`--quickstart`) project, Strapi downloads the node modules and the Strapi files needed. Using `--quickstart` automatically completes an **additional** step of **building the administration panel** for Strapi and then **starting** Strapi for you. This opens the browser for you and brings you to the [Welcome](http://localhost:1337/admin/plugins/users-permissions/auth/register) page.

You can replace the `my-project` name with any name you want. E.g., `yarn create strapi-app my-foodadvisor-project --quickstart` creates a folder `./Projects/my-foodadvisor-project`.

:::

You see something like this. The output below indicates that your Strapi project is being downloaded and installed.

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

Next, you notice the following that builds your Strapi administration panel and automatically starts up Strapi:

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
Using the `--quickstart` flag installs Strapi using an [SQLite](https://www.sqlite.org/index.html) database. You may, at any time, leave off the **--flag**, but you need to follow a few configuration steps for your database choice. **You need to have your database choice installed and running locally before creating your project.**

If you would like to use **MongoDB** in production, you need to [install, run, and use MongoDB to develop your Strapi project (in development)](../guides/databases.md#mongodb-installation).
:::

You are now ready to create a new **Administrator** and new front-end **User**.

## 2. Create an Administrator and front-end User

The first step is to create an **Administrator** (or "root user") for your project. An **Administrator** has all administrator privileges and access rights. (You can read more about why **Administrators** and front-end **Users** are separate [here](https://blog.strapi.io/why-we-split-the-management-of-the-admin-users-and-end-users/).)

You need to complete the following fields:

- **Username**, create a username for login access to your project, e.g. `paulbocuse`.
- **Password**, create a unique password for logging into your project.
- **Email address**, this is used for recovery.
- Check **Receive news**, this is optional but **recommended**.
- Click the **Ready to Start** button.

![Completed Registration Page](../assets/getting-started/tutorial/completed-registration-page.png 'Completed Registration Page')

After your **Administrator** registration is complete, you see the Strapi _Administration Dashboard_:

![Strapi Admininstration Dashboard](../assets/getting-started/tutorial/strapi-dashboard.png 'Strapi Admin Dashboard')

**Administrators** and front-end **Users** are separate roles.

**A.** An **Administrator** has access and rights to the Administration Dashboard (or backend) of Strapi. **Administrators** can, for example, add content, add plugins, and upload images.

**B.** A front-end **User** is someone who interacts with your project through the front-end. A front-end **User** can, for example, be an "Author" of an article, make a purchase, has an account, leaves a review, or leaves a comment.

Up until this point, you have created an **Administrator**, and so you next want to create a front-end **User**.

::: tip NOTE

It is not necessary to always create a front-end **User** for your **Administrators**; in this case, the **Administrator** is also a front-end **User** as an "Author" of content in the application.

:::

- Click on `Users` located under **COLLECTION TYPES** in the left-hand menu.
- Click the blue **+ Add New User** button in the top right corner.
- Next, complete the `Username`, `Email`, and `Password` fields.
- Select `ON` for the **Confirmed** toggle field.
- To the right, under **Role**, select `Authenticated`.
- Save the new user by clicking the green **Save** button (top right).

![New front-end User](../assets/getting-started/tutorial/new-front-end-user.png 'New front-end User')

You are now ready to create your first **Collection Type**.

## 3. Create a new Collection Type called "Restaurant"

A **Content Type** can be considered a sort of _blueprint_ for the data created. In other words, a **Content Type** is the schema of the data structure.

Both **Collection Type** and **Single Type** are types of **Content Type**. **Collection Type** is used for content that repeats such as restaurants, or blog posts (hence "collection"). **Single Type** is used to manage content that will have only one instance - for example, your menu, a static page, or a footer.

**Content Type** can hold data represented by fields. For example, a **Collection Type** called `Restaurant` may be intended to display information regarding restaurants. A `restaurant` **Collection Type** could have fields that include a `name`, the main `image`, and a `description` - _at a minimum_. However, a `restaurant` could also have a `category` or multiple `categories`, and a `restaurant` could perhaps need to show `Hours Of Operation`.

The next section guides you through the steps needed for each of these above **Collection Type** fields.

::: tip NOTE

Additional **Restaurant** themed **Collection Types** and fields can be seen in the [FoodAdvisor demo site](https://foodadvisor.strapi.io/).

:::

### The Restaurant Collection Type

Go to the **Content Types Builder** plugin, located in the left menu: Under **PLUGINS** -> **Content Types Builder**

You are now able to see the three available **Collection Types**. At this point, three Collection Types are available `Permission`, `Role`, and `Users`.

![Content Type Dashboard](../assets/getting-started/tutorial/content-type-dashboard.png 'Content Type Dashboard')

You need to create a new **Collection Type** for `Restaurants`.

1. Complete these steps to **Add a Restaurant Collection Type**.

- Click the `+ Create new collection type` link (under existing **COLLECTION TYPES**).
- Enter a **Name** for your new **Collection Type** (call this `restaurant`).
- Click the `Continue` button.

![Singular Name Entries for Collection Type](../assets/getting-started/tutorial/singular-name-entry.png 'Singular Name Entries or Content Type')

::: tip NOTE

The Collection Type **Name** is always **singular**. For example, `restaurant` not `restaurants`.

:::

2. You are now at the **Field Selection** panel.

You may add your first field, a **Text** field for the **Restaurant** name.

![Field Section Panel](../assets/getting-started/tutorial/field-selection-panel.png 'Field Selection Panel')

- Click on the `Text` field.
- In the **Name** field, type `name`.

![Restaurant Name Input Field](../assets/getting-started/tutorial/restaurant-name-input-field.png 'Restuarant Name Input Field')

- Click on the `ADVANCED SETTINGS` tab.
- Check the `Required field` checkbox.
- Check the `Unique field` checkbox.

![Restaurant Name Advanced Settings](../assets/getting-started/tutorial/restaurant-name-advanced-settings.png 'Restuarant Name Advanced Settings')

- Click the `+ Add another field` button.

You are now ready to add the second field, a **Rich Text** field for the **Restaurant** description.

![Field Section Panel](../assets/getting-started/tutorial/field-selection-panel-after-restaurant-name.png 'Field Selection Panel')

- Click the `Rich Text` field.

- In the **Name** field, type `description`.

![Restaurant Rich Text Field](../assets/getting-started/tutorial/restaurant-rich-text-field.png 'Restuarant Rich Text Field')

- Click the `+ Add another field` button.

You are now ready to add the third field, a **Media** field for the **Restaurant** thumbnail image.

![Field Section Panel](../assets/getting-started/tutorial/field-selection-panel-after-restaurant-description.png 'Field Selection Panel')

- Click the `Media` field.

- In the **Name** field, type `image`.

![Restaurant Rich Image Field](../assets/getting-started/tutorial/restaurant-image-field.png 'Restuarant Rich Image Field')

- Click on the **ADVANCED SETTINGS** tab.
- Check the `Required field` checkbox.

![Restaurant Rich Image Field Advanced Settings](../assets/getting-started/tutorial/restaurant-image-field-advanced-settings.png 'Restuarant Rich Image Field Advanced Settings')

- Click the `Finish` button.

Your new Content Type called **Restaurant** is ready to be **Saved**.

![Restaurant Save Screen](../assets/getting-started/tutorial/restaurant-save-screen.png 'Restuarant Save Screen')

- Click the `Save` button.

- Wait for Strapi to restart.

![Strapi Restart](../assets/getting-started/tutorial/restaurant-strapi-restart.png 'Strapi Restart')

After Strapi has restarted, you are ready to continue to create the `Category` **Collection Type**.

## 4. Create a new Collection Type called "Category"

### The Category Collection Type

The `Category` **Collection Type** will have a **Text** field named `category`, and a **Relation field** with a **Many to Many** relationship.

![Category Add Collection Type](../assets/getting-started/tutorial/category-add-content-type.png 'Category Add Collection Type')

1. Complete these steps to **add a Category Collection Type**.

- Click the `+ Create new collection type` link.
- Enter a **Name** for your new **Collection Type** (call this `category`).

![Category Name Field](../assets/getting-started/tutorial/category-name-field.png 'Category Name Field')

- Click the `Continue` button.

2. Now, you are ready to add fields to your **Category**.

![Category Fields](../assets/getting-started/tutorial/category-fields.png 'Category Fields')

- Click on the `Text` field.
- In the **Name** field, type `name`.

![Category Name Entry Field](../assets/getting-started/tutorial/category-name-entry-field.png 'Category Name Entry Fields')

- Click on the `ADVANCED SETTINGS` tab.
- Check the `Required field` checkbox.
- Check the `Unique field` checkbox.

![Category Advanced Settings](../assets/getting-started/tutorial/category-advanced-settings.png 'Category Advanced Settings')

- Click the `+ Add another field` button.

You are now ready to add the second field, a **Relation** field for creating a **Many to Many** relationship between the **Category** and **Restaurant** Collection Types.

- Click on the `Relation` field.

![Category Add Field Panel](../assets/getting-started/tutorial/category-add-field-panel-after-category-name.png 'Category Add Field Panel')

This brings you to the **Add New Relation** screen.

![Category New Relation Field](../assets/getting-started/tutorial/category-new-relation-field.png 'Category New Relation Field')

- Click on the _right dropdown_ with `Permission (Users-Permissions)` and change it to `Restaurant`.

![Category Relation Dropdown](../assets/getting-started/tutorial/category-relation-dropdown.png 'Category Relation Dropdown')

- Click the `Many to Many` icon (from the middle icon choices). It should now read, **"Categories has and belongs to many Restaurants"**.

![Category Relation Many to Many](../assets/getting-started/tutorial/category-relation-many-to-many.png 'Category Relation Many to Many')

- Click the `Finish` button.

![Category Save](../assets/getting-started/tutorial/category-save.png 'Category Save')

- Click the `Save` button.

- Wait for Strapi to restart.

![Category Save Strapi Restart](../assets/getting-started/tutorial/categor-create-strapi-restart.png 'Category Save Strapi Restart')

After Strapi has restarted, you are ready to create a `Component` called **"Hours of Operations"**.

## 5. Create a new Component called, "Hours of Operation"

### The Hours of Operation Component

The `Restaurant` Collection Type has a **Component** field named `hours_of_operation`. This Component is **Repeatable** and for displaying the **Opening hours** and **Closing hours** of a **Restaurant**.

1. Complete these steps to **add a new Component**.

- Click the `+ Create new component` link to add a new **Component**.
- Enter a **Name** for your new **Component** (call this `hours_of_operation`).
- Select the icon of your choice.
- Create a new category for your **Component** (call it `hours`).

![Hours of Operation Add Component](../assets/getting-started/tutorial/hours-of-operation-add-compo.png 'Hours of Operation Add Component')

- Click the `continue` button.

2. Now, you are ready to add fields to your **Component**.

![Hours of Operation Add Fields](../assets/getting-started/tutorial/hours-of-operation-add-fields.png 'Hours of Operation Add Fields')

- Click on the `Text` field.
- In the **Name** field, type `day_interval`. This is to enter the **Day (or Days)** with **Hours of Operation**.

![Hours of Operation Days](../assets/getting-started/tutorial/hours-of-operation-days.png 'Hours of Operation Days')

- Click on the `ADVANCED SETTINGS` tab.
- Check the `Required field` checkbox.

![Hours of Operation Days Advanced Settings](../assets/getting-started/tutorial/hours-of-operation-days-advanced-settings.png 'Hours of Operation Days Advanced Settings')

- Click the `+ Add another field`.

You are now ready to add a second field, another **Text** field for the **Opening Hours**.

![Hours of Operation Opening Hours](../assets/getting-started/tutorial/hours-of-operation-opening-hours.png 'Hours of Operation Opening Hours')

- Click on the `Text` field.
- In the **Name** field, type `opening_hours`.

![Hours of Operation Opening Hours Name](../assets/getting-started/tutorial/hours-of-operation-opening-hours-name.png 'Hours of Operation Opening Hours Name')

- Click the `+ Add another field` button.

You are now ready to add a third field, another **Text** field for the **Closing Hours**.

![Hours of Operation Closing Hours](../assets/getting-started/tutorial/hours-of-operation-closing-hours.png 'Hours of Operation Closing Hours')

- Click on the `Text` field.
- In the **Name** field, type `closing_hours`.

![Hours of Operation Closing Hours Name](../assets/getting-started/tutorial/hours-of-operation-closing-hours-name.png 'Hours of Operation Closing Hours Name')

- Click the `Finish` button.

![Hours of Operation Save](../assets/getting-started/tutorial/hours-of-operation-save.png 'Hours of Operation Save')

- Click the `Save` button.
- Wait for Strapi to restart.

![Hours of Operation Strapi Restart](../assets/getting-started/tutorial/hours-of-operation-strapi-restart.png 'Hours of Operation Strapi Restart')

After Strapi has restarted, you are ready to assign this **Hours Of Operation** Component to the **Restaurant** Collection Type.

::: tip NOTE

It would be possible to assign the **Hours Of Operation** Component to another **Collection Type**, let's say, a **Cafe** Collection Type. You have the option to reuse this component across your application.

:::

3. Next, you need to assign the **Hours Of Operation** Component to the **Restaurant** Collection Type.

To access the **Hours Of Operation** Component from within the **Restaurant** Collection Type, you need to **edit** the **Restaurant** Collection Type in the **Content Type Builder**.

- If needed, navigate back to the **Content Type Builder**.

![Edit Restaurant Collection Type](../assets/getting-started/tutorial/edit-restaurant-content-type.png 'Edit Restaurant Collection Type')

- Click on the `Restaurant` Collection Type, under **COLLECTION TYPES**.

![Edit Restaurant Add Another Field](../assets/getting-started/tutorial/edit-restaurant-add-another-field.png 'Edit Restaurant Add Another Field')

- Click on the `+ Add another field` button to add the **Component**

![Edit Restaurant Component Field](../assets/getting-started/tutorial/edit-restaurant-group-field.png 'Edit Restaurant Component Field')

- Click on the `Component` field.
- Select `Use an existing component` option.
- Click on the `Select a component` button.

![Restaurant Component Inputs](../assets/getting-started/tutorial/restaurant-group-inputs-use.png 'Restaurant Component Inputs')

- Ensure `hours_of_operation` is displayed in the **Select a component** dropdown.
- Provide a **name** for this component in the **Restaurant** Collection Type. E.g. `restaurant_hours`
- Select the `Repeatable component` option.

![Restaurant Component Inputs](../assets/getting-started/tutorial/restaurant-group-inputs.png 'Restaurant Component Inputs')

- Click on the `ADVANCED SETTINGS` tab.
- Check the `Required field` checkbox.

![Restaurant Component Advanced Settings](../assets/getting-started/tutorial/restaurant-group-advanced-settings.png 'Restaurant Component Advanced Settings')

- Click the `Finish` button.

![Restaurant Component Save](../assets/getting-started/tutorial/restaurant-group-save.png 'Restaurant Component save')

- Click the `Save` button.

- Wait for Strapi to restart.

![Restaurant Component Strapi Restart](../assets/getting-started/tutorial/restaurant-group-strapi-restart.png 'Restaurant Component Strapi Restart')

After Strapi has restarted, you are ready to continue to the next section where you customize the user-interface of your **Restaurant** Collection Type.

4. Next, you will edit the **View Settings** for the new **Hours Of Operation Component** from within the **Content Manager**.

You can _drag and drop_ fields into a different layout and _rename the labels_. This are two examples of how you can customize the user interface for your **Collection Types**.

- Click on the `Configure the view`, button.

![Content Manager](../assets/getting-started/tutorial/content-manager-restaurant.png 'Content Manager')

- Click on the `Set the component's layout`.

![Content Manager Components Tab](../assets/getting-started/tutorial/content-manager-restaurant-group.png 'Content Manager Components Tab')

- Rearrange the fields and make them more user friendly. Grab the `Opening_hours` and slide it in front of `Closing_hours`.

![Content Manager Hours Of Operation Rearrange Fields](../assets/getting-started/tutorial/content-manager-hoursofoperation-rearrange-fields.png 'Content Manager Hours Of Operation Rearrange Fields')

Next, you will change the **field labels** to make them easier to understand.

- Click on the `Day_interval` field.
- Edit the **Label** to read, `Day (or Days)`.
- Add a **Description**, `You can type in one day or a series of days to complete this field. E.g. "Tuesday" or "Tues - Wed"`.
- Click on the green **Done** button.

![Content Manager Hours Of Operation Day Interval](../assets/getting-started/tutorial/content-manager-hoursofoperation-day-interval.png 'Content Manager Hours Of Operation Day Interval')

- Click on the `Opening_hours` field.
- Edit the **Label** to read, `Opening Hours`.

![Content Manager Hours Of Operation Opening Hours](../assets/getting-started/tutorial/content-manager-hoursofoperation-day-opening-hours.png 'Content Manager Hours Of Operation Day Opening Hours')

- Click on `Closing_hours` field.
- Edit the **Label** to read, `Closing Hours`.

![Content Manager Hours Of Operation Closing Hours](../assets/getting-started/tutorial/content-manager-hoursofoperation-day-closing-hours.png 'Content Manager Hours Of Operation Day Closing Hours')

- Click the `Save` button, and then the `Confirm` button to save your settings.

Your settings are now saved.

Whenever anyone enters in information for a **Restaurant**, the entry form is cleared. With Strapi you can modify these and more settings to provide the best experience possible.

You are ready to start inputting actual content.

## 6. Manage and add content to a "Restaurant" Collection Type

You are now ready to add some **Restaurants** and **Categories**.

1. You are now going to enter a new **Restaurant**.

- Navigate to and click on the `Restaurants`, under **Collection Types** in the left-hand menu.

![Restaurants Content Type](../assets/getting-started/tutorial/restaurants-content-type.png 'Restaurants Content Type')

- Next, click on the **+ Add new Restaurant** button (in the top right corner).
- Enter in the following information for your first **Restaurant** called **Biscotte Restaurant**.
  - In the **Name** field, enter `Biscotte Restaurant`.
  - In the **Description** field, enter `Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers.`.
  - Upload an **Image** to represent the **Restaurant**.

**Note:** At this point, you would generally select the **Categories** for this **Restaurant**. You have not entered any **Categories**, so you do this step after entering this first **Restaurant**.

![Restaurant Content Type Basic Data](../assets/getting-started/tutorial/restaurant-content-type-basic-data.png 'Restaurant Content Type Basic Data')

- Next scroll down to **Restaurant_hours(0)** and click the `+ ADD NEW ENTRY` button.
  - In the **Create an Entry** section, enter the following details.
    - In the **Day (or Days)** field, enter `Sun - Mon`.
    - In the **Opening Hours** field, enter `Closed`.
    - **Skip** the **Closing Hours** field, as this **Restaurant** is closed all day.
  - Click the `+ ADD NEW ENTRY` button to create another new entry.
    - In the **Day (or Days)** field, enter `Tues - Fri`.
    - In the **Opening Hours** field, enter `12:00`.
    - In the **Closing Hours** field, enter `22:30`.
  - Click the `+ ADD NEW ENTRY` button to create the last entry.
    - In the **Day (or Days)** field, enter `Sat`.
    - In the **Opening Hours** field, enter `11:30`.
    - In the **Closing Hours** field, enter `16:00`.

You have now entered in all the information necessary for your first **Restaurant**.

![Restaurants Entry](../assets/getting-started/tutorial/restaurants-entry.png 'Restaurants Entry')

- **Scroll up** and click the `Save` button.

Next, you need to enter in some **Categories** that can relate to the above and other **Restaurants**.

- Navigate to and click on `Categories`, under **COLLECTION TYPES** in the left-hand menu.

![Categories Entry](../assets/getting-started/tutorial/categories-content-type.png 'Categories Entry')

You are going to enter two **Categories**, but you could add as many **Categories** as you need. Later, you can add additional **Categories** and assign them to existing and new **Restaurants**.

- Click on the `+ Add New Category` button.
  - In the **Name** field, enter `French food`.
  - In the **Restaurants(0)** dropdown, select `Biscotte Restaurant`.

![Categories Entry 1](../assets/getting-started/tutorial/categories-entry-1.png 'Categories Entry 1')

- Click the `Save` button.

You now enter your second **Category**.

- Click on the `+ Add New Category` button.
  - In the **Name** field, enter `Brunch`.
  - In the **Restaurants(0)** dropdown, select `Biscotte Restaurant`.

![Categories Entry 2](../assets/getting-started/tutorial/categories-entry-2.png 'Categories Entry 2')

- Click the `Save` button.

You have now entered your first **Restaurant** Content Type. You have also assigned two **Categories** to this **Restaurant**. Your next step is to set the **Roles and Permissions**.

## 7. Set Roles and Permissions

By default, Strapi publishes all **Content Types** with restricted permissions. That means you have to explicitly give permissions to each **Content Type** you create. You are going to give **Public** API (or URL) access to both the **Restaurant** Collection Type and **Category** Collection Type.

- Click on the `Roles & Permissions` menu item, under **PLUGINS** in the left-hand-menu.

![Roles and Permissions](../assets/getting-started/tutorial/roles-and-permissions.png 'Roles And Permissions')

- Next, click on the **Public** Role.

![Roles and Permissions Public Role](../assets/getting-started/tutorial/roles-and-permissions-public-role.png 'Roles And Permissions Public Role')

- Next, scroll down under **Permissions** and locate the **Restaurant** and **Category** Collection Types.
- Click the checkbox for **find** and **findone** in the **Restaurant** Collection Type.
- Click the checkbox for **find** and **findone** in the **Category** Collection Type.

![Roles and Permissions Find Permissions](../assets/getting-started/tutorial/roles-and-permissions-find-permissions.png 'Roles And Permissions Find Permissions')

- Scroll back to the top, and click the **Save** button.

You have now opened the API and are ready to consume the content.

## 8. Consume the Content Type API

Each of your **Collection Types** are accessible by following their automatically generated routes.

Both your **Restaurant** and **Category** Collection Types can now be accessed.

- In your browser, follow `http://localhost:1337/restaurants` to return the data for the allowed **Find** value of your **Restaurant** Collection Type

![Restaurant Api](../assets/getting-started/tutorial/restaurant-api.png 'Restaurant API')

- In your browser, follow `http://localhost:1337/categories` to return the data for the allowed **Find** value of your **Category** Collection Type.

![Category Api](../assets/getting-started/tutorial/category-api.png 'Category API')

::: tip NOTE

If you have incorrectly (or not at all) set the permissions of your content type, you get a **"403"** permission error. See the below example.

Forbidden Access Looks like this:

![Forbidden Access to Restaurant Content Type](../assets/getting-started/tutorial/permission-forbidden-access.png 'Forbidden Access to Restaurant Content Type')
:::

::: tip NOTE

If you would like to see the route of any specific **Content Type**, you need to navigate to the **Content Type** under the **Roles and Permissions** plugin and click the ⚙️ next to the value. On the right, you see the route:

![Permission Routes](../assets/getting-started/tutorial/permission-routes.png 'Permission Routes')

:::

::: tip CONGRATULATIONS
👏 Congratulations, you have now completed the **Strapi Getting Started Tutorial**. Where to go next?

- Learn how to use Strapi with React ([Gatsby](https://blog.strapi.io/building-a-static-website-using-gatsby-and-strapi) or [Next.js](https://blog.strapi.io/strapi-next-setup/)) or Vue.js ([Nuxt.js](https://blog.strapi.io/cooking-a-deliveroo-clone-with-nuxt-vue-js-graphql-strapi-and-stripe-setup-part-1-7/)).
- Read the **concepts** to deep dive into Strapi.
- Get help on [Github Discussions](https://github.com/strapi/strapi/discussions).
- Read the [source code](https://github.com/strapi/strapi), [contribute](https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md) or [give a star](https://github.com/strapi/strapi) on GitHub.
- Follow us on [Twitter](https://twitter.com/strapijs) to get the latest news.
- [Join the vibrant and active Strapi community](https://slack.strapi.io) on Slack.
  :::
