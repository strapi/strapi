# Getting Started with GraphQL

This integration guide is following the [Getting started guide](../getting-started/quick-start.html). We assume that you have completed [Step 8](../getting-started/quick-start.html#_8-consume-the-content-type-s-api) and therefore can consume the API by browsing this [url](http://localhost:1337/restaurants).

If you haven't gone through the getting started guide, the way you request a Strapi API with [GraphQL](https://graphql.org/) remains the same except that you will not fetch the same content.

### Install the GraphQL plugin

Install the graphql plugin in your Strapi project

:::: tabs

::: tab yarn

```bash
yarn strapi install graphql
```

:::

::: tab npm

```bash
npm run strapi install graphql
```

:::

::: tab strapi

```bash
strapi install graphql
```

:::

::::

### Fetch your Restaurant collection type

Play with the [GraphQL Playground](http://localhost:1337/graphql) to fetch your content

*Request*

```graphql
query Restaurants {
  restaurants {
    id
    name
    description
    categories {
      name
    }
  }
}
```

*Response*

```json
{
  "data": {
    "restaurants": [
      {
        "id": "1",
        "name": "Biscotte Restaurant",
        "description": "Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers.",
        "categories": [
          {
            "name": "French Food"
          }
        ]
      }
    ]
  }
}
```

### Examples

These examples do not guide you to configure your client with Apollo for your [GraphQL endpoint](http://localhost:1337/graphql). Please follow the associated documentation for each client ([React](https://www.apollographql.com/docs/react/get-started/) and [Vue.js](https://apollo.vuejs.org/guide/installation.html#_1-apollo-client) here)

:::: tabs

::: tab React

Using [React](../getting-started/react.html) and [Apollo](https://www.apollographql.com/)

```js
import { gql, useQuery } from '@apollo/client';

function Restaurants() {
  const { loading, error, data } = useQuery(gql`
    query Restaurants {
      restaurants {
        id
        name
        description
        categories {
          name
        }
      }
    }`);

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <ul>
      { data.restaurants.map(restaurant => <li key={restaurant.id}>{restaurant.name}</li>) }
    </ul>
  );
}
```

:::

::: tab Vue.js

Using [Vue.js](../getting-started/vue-js.html) and [Apollo](https://www.apollographql.com/)

```js
<template>
  <div>
    <ul>
      <li v-for="restaurant in restaurants" :key="restaurant.id">
        {{ restaurant.name }}
      </li>
    </ul>
  </div>
</template>

<script>
import gql from "graphql-tag";

export default {
  data() {
    return {
      restaurants: []
    };
  },
  apollo: {
    restaurants: gql`
      query Restaurants {
        restaurants {
          id
          name
          description
          categories {
            name
          }
        }
      }`
  }
};
</script>
```

:::

::::

### Fetch your Category collection type

*Request*

```graphql
query Category {
  category(id: 1) {
    id
    name
    restaurants {
      id
      name
      description
    }
  }
}
```

*Response*

```json
{
  "data": {
    "category": {
      "id": "1",
      "name": "French Food",
      "restaurants": [
        {
          "id": "1",
          "name": "Biscotte Restaurant",
          "description": "Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers."
        }
      ]
    }
  }
}
```

### Examples

:::: tabs

::: tab React

Using [React](../getting-started/react.html) and [Apollo](https://www.apollographql.com/)

```js
import { gql, useQuery } from '@apollo/client';

function Category({ id }) {
  const { loading, error, data } = useQuery(gql`
    query Category($id: ID!) {
      category(id: $id) {
        id
        name
        restaurants {
          id
          name
          description
        }
      }
    }`, { variables: { id } });

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <div>
      <h1>{ data.category.name }</h1>
      <ul>
        { data.category.restaurants.map(restaurant => <li key={restaurant.id}>{restaurant.name}</li>) }
      </ul>
    </div>
  );
}
```

:::

::: tab Vue.js

Using [Vue.js](../getting-started/vue-js.html) and [Apollo](https://www.apollographql.com/)

```js
<template>
  <div>
    <h1>{{ category.name }}
    <ul>
      <li v-for="restaurant in category.restaurants" :key="restaurant.id">
        {{ restaurant.name }}
      </li>
    </ul>
  </div>
</template>

<script>
import gql from "graphql-tag";

export default {
  data() {
    return {
      category: {},
      routeParam: this.$route.params.id
    };
  },
  apollo: {
    category: {
      query: gql`
      query Category($id: ID!) {
        category(id: $id) {
          id
          name
          restaurants {
            id
            name
            description
          }
        }
      }
      `,
      variables() {
        return {
          id: this.routeParam
        };
      }
    }
  }
};
</script>
```

:::

::::

## Conclusion

This is how you request your Collection Types in Strapi using GraphQL.

Feel free to explore more about [GraphQL](../plugins/graphql.html)
