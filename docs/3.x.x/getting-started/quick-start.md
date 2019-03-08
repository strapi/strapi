# Quick Start Guide

<iframe width="800" height="450" src="https://www.youtube.com/embed/nux0djdHmY8" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

(A tutorial of this Quick Start guide can be found at [Quick Start Tutorial](quick-start-tutorial.html).)

___

## 1. Install Strapi globally

<iframe width="800" height="450" src="https://www.youtube.com/embed/v-vCMD2YdRk" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

(These steps continue after [Node.js and npm are properly installed](install-requirements.html).)

```bash
npm install strapi@alpha -g
```

Strapi is now installed globally on your computer. 

Type `strapi -h` in your command line to access available Strapi commands.

## 2. Create a new project

<iframe width="800" height="450" src="https://www.youtube.com/embed/ZlvI4RAsIJM" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

```bash
strapi new cms --quickstart
```
::: warning NOTE
Using the `--quickstart` flag will install Strapi using a [SQLite](https://www.sqlite.org/index.html) database. You may leave off the flag to follow the configuration steps for a different database.
:::

This will open your default browser to the Welcome page that creates an admin user.

## 3. Create an admin user

<iframe width="800" height="450" src="https://www.youtube.com/embed/Nfn3osX-5C4" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

The first user you create is the root user for your project. This user has all privileges and access rights. You will need to fill in the form of the following fields:

   - **Username**, create a username, eg. `paulbocuse`
   - **Password**, create a unique password
   - **Email address**, used for account recovery
   - Check **Receive news**, this is optional, but recommended
   - Click the **Ready to Start** button

## 4. Create a Content Type

<iframe width="800" height="450" src="https://www.youtube.com/embed/p6klmrb1yPo" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

### The Restaurant Content Type

Navigate to **PLUGINS** --> **Content Type Builder**.

The Restaurant Content Type will have a **String** field and a **Text** field (with a **WYSIWYG editor**).

1. Add a new **Content Type**:

   - Click the **"+ Add Content Type"** button.
   - Enter the *singular* (never plural) "Name" for your **New Content Type** (eg. `restaurant`), and below write a "description". (eg. `Recommended Restaurants`). 
   - Click **Save**.

2. Add the **Name Content Type field**.

   - Click **"+ Add New Field"** 
   - Click the **String** field.
   - Under the **BASE SETTINGS** tab, in the **Name** field, type `name`. 
   - Click the **ADVANCED SETTINGS** tab, check **Required field** and **Unique field**. 
   - Click **Continue**.

3. Add the **Text Content Type Field**. 

   - Click **"+ Add New Field"** 
   - Click the **Text** field.
   - Under the **BASE SETTINGS** tab, in the **Name** field, type `description`. 
   - Click the **ADVANCED SETTINGS** tab, check **Display as a WYSIWYG** and **Unique field**. 
   - Click **Continue**.

4. Click the **Save** button and wait for Strapi to restart.

### The Category Content Type

Navigate to **PLUGINS** --> **Content Type Builder**.

The Category Content Type will have a **String** field and a **Relation field** with a **Many to Many** relationship.

1. Add a new **Content Type**:

   - Click the **"+ Add Content Type"** button.
   - Enter the *singular* (never plural) "Name" for your **New Content Type** (eg. `category`), and below write a "description". (eg. `Restaurant Categories`). 
   - Click **Save**.

2. Add the **Name Content Type field**.

   - Click **"+ Add New Field"** 
   - Click the **String** field.
   - Under the **BASE SETTINGS** tab, in the **Name** field, type `name`. 
   - Click the **ADVANCED SETTINGS** tab, check **Required field** and **Unique field**. 
   - Click **Continue**.

3. Add the **Relation**. 

   - Click **"+ Add New Field"** 
   - Click the **Relation** field.
   - On the right, ensure **Restaurant** displays in the **Content Type Category** dropdown. 
   - Click the **Many to Many** icon (in the middle). It should now read, **"Categories has and belongs to many Restaurants"**.
   - Click **Continue**.

4. Click the **Save** button and wait for Strapi to restart.

## 5. Manage and add data to Content Type

<iframe width="800" height="450" src="https://www.youtube.com/embed/0kQ_G91s5u8" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

### Add data to Content Type

1. Create an entry of a restaurant called, **"Strapi Restaurant"**:

   - Click on **Restaurants** under the **CONTENT TYPES** menu.
   - Click on **+ Add New Restaurant** button. Type `Strapi Restaurant` in the **Name** field. Type `Strapi restaurant is a cosy restaurant delivering one of the very fastest and nicest dining experiences in the world, combining nods to tradition with fierce modernity, warmth with daring.` into the **Description** field. 
   - Click **Save**.

    You will see your restaurant listed in the entries. 

2. Add the **Category items** to the **Categories Content Type**. 

   - Click **Categories** under the **CONTENT TYPES** menu on the left.
   - Click **+ Add New Category** to add the category **Italian**.
        - Type `Italian` into the **Name** field.
        - Select **Strapi Restaurant** to assign this category. (See **Restaurants (0)** to the right.)
        - Click **Save**.
   - Click **+ Add New Category** to add the category **Contemporary**.
        - Type `Contemporary` into the **Name** field.
        - Select **Strapi Restaurant** to assign this category. (See **Restaurants (0)** to the right.)
        - Click **Save**.
   
    Both categories are listed on the **Category Content Type** page.

## 6. Set roles and permissions

<iframe width="800" height="450" src="https://www.youtube.com/embed/wYWCqeQEP6M" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

Give Public access to the Restaurant Content Type.

   - Click the **Roles & Permission** menu item under **PLUGINS** on the left menu.
   - Click the **pencil** edit icon to the right of the **Public** Role.
   - Scroll down under **Permissions**, find **Restaurant**. Click the checkbox next to **find**. To the right, the URL route should say, `/restaurants`.
   - Click **Save**.

## 7. Consume the Content Type API

<iframe width="800" height="450" src="https://www.youtube.com/embed/9StcmcyBrd4" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

The **Restaurant Content Type** is accessible at `http://localhost:1337/restaurants`.

::: tip CONGRATULATIONS
👏 Congratulations, you have now completed the Strapi Quick Start. We invite you to [join the vibrant and active Strapi community](/3.x.x/community.html). Please continue reviewing our docs and tutorials to further learn how Strapi can solve your needs.
:::
