# Migrating from v1 to v3

To be honest with all of you, the migration process won't be easy. The new version introduces a lot of breaking changes especially on the query part. Some features are still not available for the moment such as the authentication, users & permissions, email, media upload and GraphQL. **If you're using one of theses features, you shouldn't be able to migrate unless you rewrite these features from scratch.**

**Here are the major changes:**

- Moved from Waterline to specialized ORMs such as Mongoose (MongoDB) and Bookshelf (Postgres, MySQL, Maria, SQLite).
- New configurations structure.
- Moved from Koa@1 (generators) to Koa@2 (async functions).
- Removed middlewares from core (koa-graphql, koa-proxy, koa-ssl, koa-views).
- Better error handling with Boom.

> Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.

## Getting started

The best way to migrate your project is to generate a new empty project using the v3. Then, copy and paste your `v1-app/api` folder to the new app `v3-app/api`. The next step is to follow the categories one by one in order and you will be able to migrate your project without issues.

See the [Quick start](../getting-started/quick-start.md) section to install the latest version of Strapi.

## Configurations

The structure of the configurations has been harmonised and simplified. Files has been renamed or deleted, and some others has been added.

- `./config/general.json` renamed `./config/application.json`
- `./config/i18n.json` renamed `./config/language.json`
- `./config/globals.json` removed
- `./config/studio.json` removed
- `./config/middleware.json` added
- `./config/hook.json` added
- `./config/custom.json` added
- `./config/environments/**/databases.json` renamed `./config/environments/**/database.json`
- `./config/environments/**/response.json` added
- `./config/environments/**/custom.json` added

Please refer to the [new documentation](../configurations/configurations.md) to set the correct values in each file.


> Note: Don't forget that middlewares has been removed. Please refers to the right section of this document for more details.

## Routes

The format of the routes has changed to easily integrate multiple strategies to hit the controllers' actions. It means that the routes are not REST-limited.

#### v1.x

```json
{
  "routes": {
    "GET /post": {
      "controller": "Post",
      "action": "find"
    },
    "GET /post/:id": {
      "controller": "Post",
      "action": "findOne"
    },
    "POST /post": {
      "controller": "Post",
      "action": "create"
    },
    "PUT /post/:id": {
      "controller": "Post",
      "action": "update"
    },
    "DELETE /post/:id": {
      "controller": "Post",
      "action": "delete"
    }
  }
}
```

#### v3.x

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/post",
      "handler": "Post.find",
    },
    {
      "method": "GET",
      "path": "/post/:id",
      "handler": "Post.findOne",
    },
    {
      "method": "POST",
      "path": "/post",
      "handler": "Post.create",
    },
    {
      "method": "PUT",
      "path": "/post/:id",
      "handler": "Post.update",
    },
    {
      "method": "DELETE",
      "path": "/post/:id",
      "handler": "Post.delete",
    }
  ]
}
```

## Controllers

Koa@1.x.x was based on generators whereas Koa@2.x.x is based on async functions. It means that the `yield` word has been replaced by the `await` word. Then the `context` was passed via the function context itself. Now, the `context` is passed  through the function's parameters. Also, you don't need to apply the `try/catch` pattern in each controller's actions.

#### v1.x

```js
module.exports = {
  find: function *() {
    try {
      this.body = yield Post.find(this.params);
    } catch (error) {
      this.body = error;
    }
  }
}
```

#### v3.x

```js
module.exports = {
  find: async (ctx) => {
    ctx.body = await Post.find(this.params);
  }
}
```

## Services

The services files should stay as they are. Your generator functions can be converted into async functions but it shouldn't be necessary.

## Models

The models didn't change a lot. The `autoCreatedAt`, `autoUpdatedAt` and `autoPK` attributes have been removed and replaced by the `hasTimestamps` attribute.

> Note: The `hasTimestamps` options will only work with Bookshelf. Also you need to create the `created_at` and `updated_at` columns manually.

> Note: The `enum` type is not available for now. Also, the validations are not working properly. It means that most of the validations have to be done manually.

#### v1.x

```json
{
  "identity": "pet",
  "connection": "mongoDBServer",
  "schema": true,
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "gender": {
      "type": "string",
      "enum": ["male", "female"]
    },
    "age": {
      "type": "int",
      "max": 100
    },
    "birthDate": {
      "type": "date"
    },
    "breed": {
      "type": "string"
    }
  },
  "autoPK": true,
  "autoCreatedAt": true,
  "autoUpdatedAt": true
}
```

#### v3.x

```json
{
  "connection": "mongoDBServer",
  "options": {
    "hasTimestamps": true
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "gender": {
      "type": "string"
    },
    "age": {
      "type": "int",
      "max": 100
    },
    "birthDate": {
      "type": "date"
    },
    "breed": {
      "type": "string"
    }
  }
}
```

## Query

We were based on the popular Waterline ORM. As we said in our blog posts, Waterline suffers from a lack of maintenance and we decided to move to more specific ORMs depending on the database. It increases the performances and unblock particular features for the users. Currently, we are supporting these databases:

- MongoDB (through Mongoose).
- Postgres, MySQL, SQLite3 and more (through Bookshelf).
- Redis (through ioredis).

**This major change means that you will have to rewrite every single query of your app. So, please to be sure that you need to switch to the new version of Strapi before starting the migration.**

#### v1.x

```js
module.exports = {
  find: function *() {
    try {
      this.body = yield Post.find(this.params);
    } catch (error) {
      this.body = error;
    }
  },

  findOne: function *() {
    try {
      this.body = yield Post.findOne(this.params);
    } catch (error) {
      this.body = error;
    }
  },

  // POST request
  create: function *() {
    try {
      this.body = yield Post.create(this.request.body);
    } catch (error) {
      this.body = error;
    }
  },

  // PUT request
  update: function *() {
    try {
      this.body = yield Post.update(this.params.id, this.request.body);
    } catch (error) {
      this.body = error;
    }
  },

  // DELETE request
  delete: function *() {
    try {
      this.body = yield Post.destroy(this.params);
    } catch (error) {
      this.body = error;
    }
  }
};
```

#### v3.x

```js
module.exports = {
  find: async (ctx) => {
    // Bookshelf
    ctx.body = await Post.forge(this.params).fetchAll();
    // Mongoose
    ctx.body = await Post.find(this.params);
  },

  findOne: async (ctx) => {
    // Bookshelf
    ctx.body = await Post.forge(this.params).fetch();
    // Mongoose
    ctx.body = await Post.findOne(this.params);
  },

  create: async (ctx) => {
    // Bookshelf
    ctx.body = await Post.forge(this.request.body).save();
    // Mongoose
    ctx.body = await Post.create(this.request.body);
  },

  update: async (ctx) => {
    // Bookshelf
    ctx.body = await Post.forge({ id: 1234 }).save(this.request.body, {
      patch: true
    });
    // Mongoose
    ctx.body = await Post.update({ id: 1234 }, this.request.body);
  },

  delete: async (ctx) => {
    // Bookshelf
    ctx.body = await Post.forge({ id: 1234 }).destroy();
    // Mongoose
    ctx.body = await Post.findOneAndRemove({ id: 1234 });
  }
}
```

> Note: You will have more changes if your project is based on a SQL database. Waterline and Mongoose are almost sharing the same API.

## Middlewares

We decided to reduce the core to the minimum. So, we removed middlewares with features that shouldn't be handled by a Node.js server such as:

- GraphQL: **We love GraphQL at Strapi** and we will provide a `strapi-plugin-graphql` **very soon**.
- Proxy: There are many great server solutions to handle a proxy feature such as nginx or Caddy.
- SSL: Same as proxy.
- Views: We are building APIs, not website. However, we know that sometimes you need to render views from your API server. That's why we created a `strapi-views` hook.

### GraphQL

We are not able to give you a solution at the moment. As we said above, **we will develop in the next weeks** a dedicated plugin to integrate GraphQL into a project.

### Proxy & SSL

You should take a look at these articles to configure SSL and proxy with nginx:

- [Configuring Nginx and SSL with Node.js](https://www.sitepoint.com/configuring-nginx-ssl-node-js/)
- [Using Nginx as a reverse proxy with a Node.js app](http://www.nikola-breznjak.com/blog/javascript/nodejs/using-nginx-as-a-reverse-proxy-in-front-of-your-node-js-application/)

### Views

It works exactly as before. You need to add `strapi-views` into your app's dependencies and configure the views as below:

**Path —** `./config/environments/**/custom.json`
```json
{
  "views": {
    "enabled": true,
    "map": {
      "ejs": "ejs"
    },
    "viewExt": "ejs",
    "debug": true,
    "cache": true
  }
}
```

> Note: You might have to install the template engine by your own (ex: `npm install ejs --save`).

## Error handling

Boom is deeply integrated into the core which allows you to enjoy the entire [Boom API](https://github.com/hapijs/boom) through the context of your request. Every error throw in your project will be intercepted and decorated with Boom.

#### v1.x

```js
module.exports = {
  // GET request
  find: function *() {
    try {
      const posts = yield Post.find(this.params);

      if (posts.length === 0) {
        ctx.status = 404;
        ctx.body = 'There are no posts!';
      } else {
        ctx.body = posts;
      }
    } catch (error) {
      this.body = error;
    }
  }
};
```

#### v3.x

```js
module.exports = {
  // GET request
  find: async (ctx) => {
    const posts = await Post.find(this.params);

    if (post.length === 0) {
      ctx.notFound('There are no posts!'); // Set status to 404 and decorates error into a Boom object.
    } else {
      ctx.send(posts); // Set status to 200.
    }
  }
};
```
