# Create a slug system

In this guide we will see how to create a slug system for your Post, Article or the Content Type you want.

## Create attributes

To realize the slug system you will need a `string` filed as **base** for your slug. In this example it will be `title`.

And you need another string field that will contains the slugified value of your `title`. In this example it will be `slug`.

![Slug fields](../assets/guides/slug/fields.png)

## Configure the layout for the content editor

Let's configure the layout of the **edit page** to make it more user friendly for the content editor.

- Click on the **Content Manager** link in the left menu.
- Then on the `Article` Content Type.
- And finally on the **Edit View** tab.

Here we will be able to setup the `slug` field.

- Click on the `slug` field.
- At the bottom of the page, edit the **placeholder** value to `Generated automatically based on the title`.
- And click **OFF** for **Editable field** option.
- Don't forget to save your updates.

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "Edit View before" id="before"

![Edit View before](../assets/guides/slug/layout-before.png)

:::

::: tab "Edit View after" id="after"

![Edit View after](../assets/guides/slug/layout-after.png)

:::

::: tab "Edit View configuration" id="config"

![Edit View config](../assets/guides/slug/layout-config.png)

:::

::::

## Auto create/update the `slug` attribute

For that you will have to install `slugify` node module in your application.

When it's done, you have to update the life cycle of the **Article** Content Type to auto complete the `slug` field.

**Path —** `./api/article/models/Article.js`

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "Mongoose" id="mongoose"

```js
const slugify = require('slugify');

module.exports = {
  beforeSave: async model => {
    if (model.title) {
      model.slug = slugify(model.title);
    }
  },
  beforeUpdate: async model => {
    if (model.getUpdate().title) {
      model.update({
        slug: slugify(model.getUpdate().title),
      });
    }
  },
};
```

:::

::: tab "Bookshelf" id="bookshelf"

```js
const slugify = require('slugify');

module.exports = {
  beforeSave: async (model, attrs, options) => {
    if (options.method === 'insert' && attrs.title) {
      model.set('slug', slugify(attrs.title));
    } else if (options.method === 'update' && attrs.title) {
      attrs.slug = slugify(attrs.title);
    }
  }
}

:::

::::

## Fetch article by `slug`

Then you will have to be able to fetch your **Articles** by this slug.

You will be able to find your articles by slug with this request `GET /articles?slug=my-article-slug`
```
