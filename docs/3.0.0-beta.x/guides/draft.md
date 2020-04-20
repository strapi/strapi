# Draft system

This guide will explain how to create a draft system that will allow you to manage draft, published, and archive status.

## Introduction

What we want here is to fetch only data that has a `published` status.

But we don't want to use [parameters](../content-api/parameters.md) (eg. /articles?status=published) because you can easily fake the params.

To be able to do that, you have first to understand some concepts.

When you create a content type, it generates an API with the following list of [endpoints](../content-api/endpoint.md).

Each of these endpoint triggers a controller action. Here is the list of [controller actions](../concepts/controller.md) that exist by default when a content type is created.

If you check the controller file of your generated API `./api/{content-type}/controller/{Content-Type}.js`, you will see an empty file. It is because all the default logic is managed by Strapi. But you can override these actions with your own code.

And that is what we will do to filter to `published` status by default.

## Example

In our example we will use an Article content type. By default, when you fetch articles you will get all articles.
Let's consider you don't want to expose articles that are in `draft` or `archive` status.

To enforce this rule we will customize the action that fetches all articles to just fetch `published` articles.

To follow the example you will have to create a content type `articles` and add the following field definitions:

- `string` attribute named `title`
- `text` attribute named `content`
- `enumeration` attribute named `status` with `draft`, `published`, `archive`

Then add some data with different `status`.

## Override controller action

To customize the function that fetches all our articles we will have to override the `find` function.

First, to see the difference, let's request `GET /articles`. You will see all the data you created.
Now let's start the customization.

**Path —** `./api/article/controller/Article.js`

```js
module.exports = {
  async find() {
    return 'strapi';
  },
};
```

After saving the new function, let's restart the `GET /articles` request. We will see `strapi` as response.

## Get the data back

We now know the function we have to update, but we just want to customize the returned article values.

In the [controller documentation](../concepts/controllers.html#extending-a-model-controller) you will find the default implementation of every action. It will help you overwrite the fetch logic.

**Path —** `./api/article/controller/Article.js`

```js
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.article.search(ctx.query);
    } else {
      entities = await strapi.services.article.find(ctx.query);
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.article }));
  },
};
```

And now the data is back on `GET /articles`

## Apply our changes

Here we want to force it to fetch articles that have status equal to `published`.

The way to do that is to set `ctx.query.status` to `published`.
It will force the filter of the query.

**Path —** `./api/restaurant/controller/Restaurant.js`

```js
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  async find(ctx) {
    let entities;

    ctx.query = {
      ...ctx.query,
      status: 'published',
    };

    if (ctx.query._q) {
      entities = await strapi.services.article.search(ctx.query);
    } else {
      entities = await strapi.services.article.find(ctx.query);
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.article }));
  },
};
```

And tada! Draft and archived articles disappeared.

::: tip
This guide can be applied to any other controller action.
:::
