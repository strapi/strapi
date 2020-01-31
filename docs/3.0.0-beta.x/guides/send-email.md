# Send email programmatically

In this guide we will see how to use the Email plugin to send email where you want in your app.

For this example we want to receive an email when a new article's comment is posted and if it contains bad words.

## Introduction

What we want here is to add some custom logic and call the email service when a `Comment` is created via the `POST /comments` endpoint.

To be able to do that, you have first to understand some concepts.

When you create a content type, it generates an API with the following list of [endpoints](../content-api/endpoint.md).

Each of these endpoint triggers a controller action. Here is the list of [controller actions](../concepts/controller.md) that exist by default when a content type is created.

If you check the controller file of your generated API `./api/{content-type}/controller/{Content-Type}.js`, you will see an empty file. It is because all the default logic is managed by Strapi. But you can override these actions with your own code.

And that is what we will do to add our custom code.

## Example

To keep the code example realy easy to follow, we will just have a `Comment` content type and omit the `Author` and `Article` relations.

So lets create a `Comment` content type with just one **Text** field named `content`.

When the content type is created, allow the create function for the Public role.

To check if bad words are in the comment we will use `bad-words` [node module](https://www.npmjs.com/package/bad-words). You will have to install it in your application.

## Override controller action

To customize the function that creates a comment we will have to override the `create` function.

First, to see the difference, let's request `POST /comment` with `that is fucking good!` for the `content` attribute.
You will see your comment is successfully created.

Now let's start the customization.

**Path —** `./api/comment/controller/Comment.js`

```js
module.exports = {
  async create() {
    return 'strapi';
  },
};
```

After saving the new function, let's restart the `POST /comment` request. We will see `strapi` as response.

## Get the comment creation back

We now know the function we have to update. Let's get back to the original function.

In the [controller documentation](../concepts/controllers.html#extending-a-model-controller) you will find the default implementation of every actions. It will help you overwrite the create logic.

**Path —** `./api/comment/controller/Comment.js`

```js
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.comment.create(data, { files });
    } else {
      entity = await strapi.services.comment.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.models.comment });
  },
};
```

And now the comment creation is back.

## Apply our changes

We want to check if the content of the comment contains a bad words.

If it does, we want to send an email using the [Email plugin](../plugins/email.md)

**Path —** `./api/comment/controller/Comment.js`

```js
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

const Filter = require('bad-words');
const filter = new Filter();

module.exports = {
  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.comment.create(data, { files });
    } else {
      entity = await strapi.services.comment.create(ctx.request.body);
    }

    entry = sanitizeEntity(entity, { model: strapi.models.comment });

    // check if the comment content contains a bad word
    if (entry.content !== filter.clean(entry.content)) {

      // send an email by using the email plugin
      await strapi.plugins['email'].services.email.send({
        to: 'paulbocuse@strapi.io',
        from: 'admin@strapi.io'
        subject: 'Comment posted that contains a bad words',
        text: `
          The comment #${entry.id} contain a bad words.

          Comment:
          ${entry.content}
        `,
      });
    }

    return entry;
  },
};
```

And tada, it works.
