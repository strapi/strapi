# Custom data response

In this guide we will see how you can customize your API's response.

## Introduction

To be able to update the default data response you have first to understand how it works.

When you create a content type, it generates an API with the following list of [endpoints](../content-api/api-endpoints.md).

Each of these endpoint triggers a controller action. Here is the list of [controller actions](../concepts/controllers.md) that exist by default when a content type is created.

If you check the controller file of your generated API `./api/{content-type}/controller/{Content-Type}.js`, you will see an empty file. It is because all the default logic is managed by Strapi. But you can override these actions with your own code.

And that is what we will do to manage our custom data response.

## Example

In our example we will use a restaurant type with a chef. By default when you fetch restaurants, you will get all information for the chef.
Let's consider you don't want to expose the chef's email for privacy reasons.

To enforce this rule we will customize the action that fetches all restaurants and remove the email from the returned data.

To follow the example your will have to create a content type `restaurant` and add the following field definition:

- `string` attribute named `name`
- `text` attribute named `description`
- `relation` attribute **Restaurant** (`chef`) - **User** has many **Restaurants** - **Users** (`restaurants`)

Then add some data.

## Override controller action

To customize the function that fetch all our restaurants we will have to override the `find` function.

First, to see the difference, let's request `GET /restaurants`. You will see all the data you created.
Now let's start the customization.

**Path —** `./api/restaurant/controller/Restaurant.js`

```js
module.exports = {
  async find() {
    return 'strapi';
  },
};
```

After saving the new function, let's restart the `GET /restaurants` request. We will see `strapi` as response.

## Get the data back

We now know the function we have to update, but we just want to customize the returned restaurant values.

In the [controller documentation](../concepts/controllers.html#extending-a-model-controller) you will find the default implementation of every actions. It will help you overwrite the fetch logic.

**Path —** `./api/restaurant/controller/Restaurant.js`

```js
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.restaurant.search(ctx.query);
    } else {
      entities = await strapi.services.restaurant.find(ctx.query);
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.restaurant }));
  },
};
```

And now the data is back on `GET /restaurants`

## Apply our changes

We can see the `find` function returns the result of the `map`. And the map function just sanitizes all entries.

So instead of just returning the sanitized entry, we will also remove the chef email of each restaurant.

**Path —** `./api/restaurant/controller/Restaurant.js`

```js
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.restaurant.search(ctx.query);
    } else {
      entities = await strapi.services.restaurant.find(ctx.query);
    }

    return entities.map(entity => {
      const restaurant = sanitizeEntity(entity, {
        model: strapi.models.restaurant,
      });
      if (restaurant.chef && restaurant.chef.email) {
        delete restaurant.chef.email;
      }
      return restaurant;
    });
  },
};
```

And tada! The email disappeared.

::: tip
This guide can be applied to any other controller action.
:::
