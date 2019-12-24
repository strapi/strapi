# Authenticated request

In this guide we will see how you can request the API as an authenticated user.

## Introduction

To let you understand many concepts mainly on the [roles and permissions](../plugins/users-permissions.md#manage-roles-permissions) part, we will user many users and roles.

After that we will see the [authentication workflow](../plugins/users-permissions.md#authentication) to get a `JWT` and use it for an API request.

We will have one group of users that will be able to only fetch **Articles** and an other group that will be able to fetch, create and update **Articles**.

## Setup

### Create Content Type

Lets create a new Content Type **Article**

- Click on `Content Type Builder` in the left menu
- Then `+ Create new content-type`
- Fill `Display name` with `article`
- Create 2 fields
  - **Text** short named `title`
  - **Rich text** named `content`
- And save this new Content Type

Then create some **Articles** from the Content Manager.

### Create Roles & Permissions

We will create 2 new groups to manage available actions for different kind of users.

- Click on `Roles & Permissions` in the left menu
- Then `+ Add New Role`
- Fill `name` with `Author`
- Check `Select All` for the Application Article Content Type.
- And save the new role

And repeat the opperation for the `Reader` group and check `find`, `findOne` and `count`.

### Create users

Finally create **2 users** with the following data.

**User 1**

- **username**: author
- **email**: author@strapi.io
- **password**: strapi
- **role**: Author

**User 2**

- **username**: reader
- **email**: reader@strapi.io
- **password**: strapi
- **role**: Reader

## Login as a Reader

To login as a user your will have to follow the [login documentation](../plugins/users-permissions.md#login).

Here is the API route for the authentication `/auth/local`.

You have to request it in **POST**.

:::: tabs

::: tab axios

```js
import axios from 'axios';

const { data } = await axios.post('http://localhost:1337/auth/local', {
  identifier: 'reader@strapi.io',
  password: 'strapi',
});

console.log(data);
```

:::

::: tab Postman

If you are using **Postman** for example you will have to set the `body` as `raw` with the `JSON (application/json)` type.

```json
{
  "identifier": "reader@strapi.io",
  "password": "strapi"
}
```

:::

::::

The API response contains the **user's JWT** in the `jwt` key.

```json
{
    "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNTc2OTM4MTUwLCJleHAiOjE1Nzk1MzAxNTB9.UgsjjXkAZ-anD257BF7y1hbjuY3ogNceKfTAQtzDEsU",
    "user": {
        "id": 1,
        "username": "reader",
        ...
    }
}
```

You will have to store this `JWT` in your application, it's important because you will have to use it the next requests.

### Fetch articles

Let's fetch Articles you created.

To do so, you will have to fetch `/articles` route in **GET**.

```js
import axios from 'axios';

const { data } = await axios.get('http://localhost:1337/articles');

console.log(data);
```

Here you should receive a **403 error** because you are not allowed, as Public user, to access to the **articles**.

You should use the `JWT` in the request to say that you can access to this data as **Reader user**.

```js
import axios from 'axios';

const { data } = await axios.get('http://localhost:1337/articles', {
  headers: {
    Authorization:
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNTc2OTM4MTUwLCJleHAiOjE1Nzk1MzAxNTB9.UgsjjXkAZ-anD257BF7y1hbjuY3ogNceKfTAQtzDEsU',
  },
});

console.log(data);
```

And tada you have access to the data.

### Create an Article

To do so, you will have to request the `/articles` route in **POST**.

```js
import axios from 'axios';

const {data} = await axios
  .get('http://localhost:1337/articles',  {
    data: {
      title: 'my article'
      content: 'my super article content'
    },
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNTc2OTM4MTUwLCJleHAiOjE1Nzk1MzAxNTB9.UgsjjXkAZ-anD257BF7y1hbjuY3ogNceKfTAQtzDEsU'
    }
  });

console.log(data);
```

If you request this as a **Reader user**, you will receive a **403 error**. It's because the **Reader role** not have access to the `create` function of the **Article** Content Type.

To fix that you will have to login with the **Author user** and use his `JWT` into the request to create an **Article**.

With that done, you will be able to create an **Article**.
