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

![Strapi Welcome Page for creating admin user](../assets/strapi-welcome-screen.jpg 'Strapi Welcome Page for creating admin user')

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

![Example completed Welcome Screen with Admin User information](../assets/welcome-screen-entered-information.jpg 'Example completed Welcome Screen with Admin User information')

---

After your admin user is registered, you will see the Strapi admin panel:

![Strapi Admin Panel](../assets/AfterRegistrationScreenAdminPanel.jpg 'Strapi Admin Panel')

---

Every user is found by clicking in the left menu: **CONTENT TYPES** --> **Users**.

![Strapi Users Content Type Menu Item](../assets/AfterRegistrationScreenAdminPanelChooseUsersMenu.jpg 'Strapi Users Content Type Menu Item')

From here you can add and edit users.

![Strapi Users Page](../assets/AdminUserInUsers.jpg 'Strapi Users Page')

---

Now let's see how to [create a Content Type](#_3-create-a-content-type).

---

## 3. Create a Content Type

At this point, your project is empty. You need to create a Content Type. We will use the **Content Type Builder** plugin.

Go to the **Content Type Builder** plugin, located in the left menu: **PLUGINS** --> **Content Type Builder**:

![Choose Content Type Item Location](../assets/AfterRegistrationScreenAdminPanelChooseContentType.jpg 'Choose Content Type Item Location')

We will create two content types. We will create a content type for **Restaurant** and **Category**.

![Create Content Type Screen](../assets/CreateContentTypeScreen.jpg 'Create Content Type Screen')

::: warning NOTE

Content Type _name_ is always **singular**. For example, **restaurant** not restaurants.

:::

### The "Restaurant" Content Type

The "Restaurant" Content Type will have a String Field named "Name" for the restaurant name, and a Text field (with a WYSIWYG editor) named "Description" for the restaurant description.

### The "Category" Content Type

The "Category" Content Type will have a String field named "Category for categories assigned to restaurants, and a Relation field with a Many to Many relationship.

add Description of the new Content Type : Recommend Restaurants

Add New Fields - click Add New Field

Let's give it a name, click String, Name - Strapi Restaurant, click Advanced Settings Tab, check Required field, unique field

Click Continue

Click on text - type in Description
click on tab Advanced Settings - Check "Display as a WYSIWYG"
Click Continue

Click Save for Restaurant

Let Strapi Save and wait for restart.

At this point, your project is empty. To create your first Content Type, you are going to use the **Content Type Builder** plugin: a powerful UI to help defining your Content Type's structure within a few clicks. Let's take the example of blog, which manages posts.

**#1 —** Go to the **Content Type Builder** plugin.

![Content Type Builder - Home](../assets/getting-started_no_content_type.png)

**#2 —** Create a Content Type named `Post` and submit the form.

![Content Type Builder - Create a new Content Type](../assets/getting-started_create_content_type.png)

**#3 —** Add three fields in this Content Type.

- A `string` field named `title`.
- A `text` field named `content` (tick the `Display as WYSIWYG` in the `Advanced Settings` tab).
- A `media` field named `cover`.

![Content Type Builder - List fields in Post](../assets/getting-started_list_fields.png)

**#4 —** Save. That's it!

::: note
See the [CLI documentation](../cli/CLI.md#strapi-generateapi) for more information on how to do it the hacker way.
:::

### Files structure

A new directory has been created in the `./api` folder of your application which contains all the needed stuff for your `Post` Content Type: routes, controllers, services and models. Take a look at the [API structure documentation](../concepts/concepts.md#files-structure) for more informations.

**Well done, you created your first Content Type using Strapi!**

---

## 4. Manage and add data to Content Type

After creating [your first Content Type](#_3-create-a-content-type), you probably want to create, edit or delete entries. No worries, everything is ready for you:

**#1 —** Go to the [**Post list**](http://localhost:1337/admin/plugins/content-manager/post/) by clicking on the link in the left menu (generated by the **Content Manager** plugin).

![Content Type Builder - Home](../assets/getting-started_no_entry.png)

**#2 —** Click on the button `Add New Post` and fill the form.

![Content Type Builder - Home](../assets/getting-started_add_entry.png)

**#3 —** Save! You can edit or delete this entry by clicking on the icons at the right of the row.

![Content Type Builder - Home](../assets/getting-started_with_entry.png)

---

## 5. Set roles and permissions

## 6. Consume the Content Type API

Your API is now ready and [contains data](#_4-add-content). At this point, you'll probably want to use this data in mobile or desktop applications.
In order to do so, you'll need to allow access to other users (identified as 'Public').

**1 -** Go to the [**Roles & Permissions View**](http://localhost:1337/admin/plugins/users-permissions/roles) by clicking on **Roles & Permissions** link in the left menu.

![Auth & Permissions - Home](../assets/getting-started_manage_role_home.png)

**2 -** Click on the `Public` role, enable the actions related to your new Content Type and save:

![Auth & Permissions - Edit Public](../assets/getting-started_allow_access.png)

::: note
You should now be able to get the list of posts from the API: [http://localhost:1337/posts](http://localhost:1337/posts).
:::

### List entries (GET)

To retrieve the list of posts, use the `GET /posts` route.

Generated APIs provide a handy way to filter and order queries. In that way, ordering posts by price is as easy as `GET http://localhost:1337/posts?_sort=price:asc`. For more informations, read the [filters documentation](../guides/filters.md).

Here is an example using Axios:

```js
import axios from 'axios';

// Request API.
axios
  .get('http://localhost:1337/posts', {
    params: {
      _sort: 'createdAt:desc', // Generates http://localhost:1337/posts?_sort=createdAt:desc
    },
  })
  .then(response => {
    // Handle success.
    console.log('Well done, here is the list of posts: ', response.data);
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Get a specific entry (GET)

If you want to get a specific entry, add the `id` of the wanted post at the end of the url.

Example with Axios:

```js
import axios from 'axios';

const postId = 'YOUR_POST_ID_HERE'; // Replace with one of your posts id.

// Request API.
axios
  .get(`http://localhost:1337/posts/${postId}`)
  .then(response => {
    // Handle success.
    console.log('Well done, here is the post: ', response.data);
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Create data (POST)

Use the `POST` route to create a new entry.

Example with Axios:

```js
import axios from 'axios';

// Request API.
axios
  .post(`http://localhost:1337/posts/`, {
    title: 'My new post',
  })
  .then(response => {
    // Handle success.
    console.log(
      'Well done, your post has been successfully created: ',
      response.data,
    );
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Update data (PUT)

Use the `PUT` route to update an existing entry.

Example with Axios:

```js
import axios from 'axios';

const postId = 'YOUR_POST_ID_HERE'; // Replace with one of your posts id.

// Request API.
axios
  .put(`http://localhost:1337/posts/${postId}`, {
    title: 'Updated title',
  })
  .then(response => {
    // Handle success.
    console.log(
      'Well done, your post has been successfully updated: ',
      response.data,
    );
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Delete data (DELETE)

Use the `DELETE` route to delete an existing entry.

Example with Axios:

```js
import axios from 'axios';

const postId = 'YOUR_POST_ID_HERE'; // Replace with one of your posts id.

// Request API.
axios
  .delete(`http://localhost:1337/posts/${postId}`)
  .then(response => {
    // Handle success.
    console.log(
      'Well done, your post has been successfully updated: ',
      response.data,
    );
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

---

#### 👏 Congratulations!

You successfully finished the Getting Started guide! Read the [concepts section](../concepts/concepts.md) to understand more deeply how to use and customize Strapi.

Also, feel free to join the community thanks to the different channels listed in the [community page](http://strapi.io/community): team members, contributors and developers will be happy to help you.
