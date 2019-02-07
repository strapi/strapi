# Quick start

We have created an Quick Start installation which will set-up, configure and get Strapi up and running effortlessly.

::: warning NOTE
Quick start will install Strapi using a SQLite database. [SQLite](https://www.sqlite.org/index.html) is likely used more than all other database engines combined.
:::

This quick start is written for developers who prefer an intermediate or more advanced introduction to Strapi. A more detailed version of this Quick Start page can be found at [Quick Start - Detailed](/3.x.x/installation-options/quick-start-detailed.html) in the **Installation Options** section.

(You should have already completed the steps to install Strapi and the requirements from [Installation Requirements](install-requirements.html). These steps continue after ensuring nodejs, NPM and strapi are all properly installed.)

This page explains how to create a new project in Strapi. ([Check out our video tutorial](https://www.youtube.com/watch?v=yMl5IcFHA74)).

## 1. Create a project

Navigate to your parent "projects" directory in your command line. Enter the following command to create a Strapi Quick Start project.

```bash
str@pi:~/Desktop/Strapi/Projects$ strapi new my-project --quickstart
```

The command will automatically create a Strapi app folder within your parent "projects" directory.

This will open your default browser to the Welcome page for creating an admin user.

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

---

After your admin user is registered, you will see the Strapi admin panel.

::: warning NOTE
Every user is found by clicking in the left menu: Content Type --> Users. From here you can add and edit users.
:::

Now let's see how to [create a Content Type](#_3-create-a-content-type).

---

## 3. Create a Content Type

At this point, your project is empty. You need to create a Content Type. We will use the **Content Type Builder** plugin.

We will create two content types for our headless CMS. We will create a content type for restaurants and restaurant category.

We will create two content types. A "Restaurant" Content Type and a "Category" Content Type. The "Restaurant" Content Type will have a String Field named "Name" for the restaurant name, and a Text field (with a WYSIWYG editor) named "Description" for the restaurant description. The "Category" Content Type will have a String field named "Category for categories assigned to restaurants, and a Relation field with a Many to Many relationship.

::: warning NOTE

Content Type name is always singular. For example, restaurant not restaurants.

:::

Should be singular : restaurant

add Description of the new Content Type : Recommend Restaurants

Add New Fields - click Add New Field

Let's give it a name, click String, Name - Strapi Restaurant, click Advanced Settings Tab, check Required field, unique field

Click Continue

Click on text - type in Description
click on tab Advanced Settings - Check "Display as a WYSIWYG"
Click Continue

Click Save for Restaurant

Let Strapi Save and wait for restart.
