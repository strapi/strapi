# Getting Started with Gridsome

This integration guide is following the [Getting started guide](../getting-started/quick-start.html). We assume that you have completed [Step 8](../getting-started/quick-start.html#_8-consume-the-content-type-s-api) and therefore can consume the API by browsing this [url](http://localhost:1337/restaurants).

If you haven't gone through the getting started guide, the way you request a Strapi API with [Gridsome](https://gridsome.org/) remains the same except that you will not fetch the same content.

### Create a Gridsome app

Create a basic Gridsome application using the [Gridsome CLI](https://gridsome.org/docs/gridsome-cli/).

```bash
gridsome create gridsome-app
```

### Configure Gridsome

Gridsome is a [Static Site Generator](https://www.staticgen.com/) and will fetch your content from Strapi at build time. You need to configure Gridsome to communicate with your Strapi application.

```bash
yarn add @gridsome/source-strapi
```

- Add the `@gridsome/source-strapi` to the plugins section in the `gridsome-config.js` file:

```js
module.exports = {
  siteName: 'Gridsome',
  plugins: [
    {
      use: '@gridsome/source-strapi',
      options: {
        apiURL: `http://localhost:1337`,
        queryLimit: 1000, // Defaults to 100
        contentTypes: [`restaurant`, `category`],
      },
    },
  ],
};
```

### GET Request your collection type

Execute a `GET` request on the `restaurant` Collection Type in order to fetch all your restaurants.

Be sure that you activated the `find` permission for the `restaurant` Collection Type.

_Request_

```graphql
query {
  allStrapiRestaurant {
    edges {
      node {
        id
        name
        description
      }
    }
  }
}
```

_Response_

```json
{
  "data": {
    "allStrapiRestaurant": {
      "edges": [
        {
          "node": {
            "id": 1,
            "name": "Biscotte Restaurant",
            "description": "Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers.",
            "categories": [1]
          }
        }
      ]
    }
  }
}
```

### Example

`./src/pages/Index.vue`

```js
<template>
<Layout>
  <ul>
    <li v-for="restaurant in $page.allStrapiRestaurant.edges" :key="restaurant.node.id">
      {{ restaurant.node.name }}
      <ul>
        <li v-for="category in restaurant.node.categories">
          <g-link :to="'categories/' + category.id">{{ category.name }}</g-link>
        </li>
      </ul>
    </li>
  </ul>
</Layout>
</template>

<page-query>
  query {
      allStrapiRestaurant {
        edges {
          node {
            id
            name
            categories {
              id
              name
            }
          }
        }
      }
    }
</page-query>
```

Execute a `GET` request on the `category` Collection Type in order to fetch a specific category with all the associated restaurants.

Be sure that you activated the `findOne` permission for the `category` Collection Type.

_Request_

```graphql
query {
  strapiCategory(id: 1) {
    id
    name
    restaurants {
      name
      description
    }
  }
}
```

_Response_

```json
{
  "data": {
    "strapiCategory": {
      "id": "1",
      "name": "French Food",
      "restaurants": [
        {
          "name": "Biscotte Restaurant",
          "description": "Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers."
        }
      ]
    }
  },
  "extensions": {}
}
```

### Example

`./src/pages/Index.vue`

```js
<template>
<Layout>
  <h1>{{ $page.strapiCategory.name }}</h1>
  <ul>
    <li v-for="restaurant in $page.strapiCategory.restaurants" :key="restaurant.id">{{ restaurant.name }}</li>
  </ul>
</Layout>
</template>

<page-query>
  query  {
    strapiCategory(id: 1) {
      id
      name
      restaurants {
        name
        description
      }
    }
  }
</page-query>
```

We can generate pages for each category.

- Tell Gridsome to generate a page for each category by updating the `gridsome-server.js` file with the following:

```js
module.exports = function(api) {
  api.createPages(async ({ graphql, createPage }) => {
    const { data } = await graphql(`
      {
        allStrapiCategory {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `);

    const categories = data.allStrapiCategory.edges;

    categories.forEach(category => {
      createPage({
        path: `/categories/${category.node.id}`,
        component: './src/templates/Category.vue',
        context: {
          id: category.node.id,
        },
      });
    });
  });
};
```

- Create a `./src/templates/Category.vue` file that will display the content of each one of your category:

```js
<template>
  <Layout>
    <div>
      <h1>{{ $page.category.name }}</h1>
      <ul>
        <li v-for="restaurant in $page.category.restaurants">{{ restaurant.name }}</li>
      </ul>
    </div>
  </Layout>
</template>

<page-query>
  query Category($id: ID!) {
      category: strapiCategory(id: $id) {
        name
        restaurants {
          id
          name
        }
      }
    }
</page-query>
```

You can find your restaurant categories by browsing `http://localhost:8080/categories/<id-of-category>`.

Feel free to do the same for your restaurants!

## Starter

- [Gridsome Blog starter](https://github.com/strapi/strapi-starter-gridsome-blog)
- [Gridsome Portfolio starter](https://github.com/strapi/strapi-starter-gridsome-portfolio)

## Conclusion

Here is how to request your Collection Types in Strapi using Gridsome.

Learn more about [GraphQL](../plugins/graphql.html)
