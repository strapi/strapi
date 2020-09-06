# Getting Started with Gatsby

This integration guide is following the [Getting started guide](../getting-started/quick-start.html). We assume that you have completed [Step 8](../getting-started/quick-start.html#_8-consume-the-content-type-s-api) and therefore can consume the API by browsing this [url](http://localhost:1337/restaurants).

If you haven't gone through the getting started guide, the way you request a Strapi API with [Gatsby](https://www.gatsbyjs.org/) remains the same except that you will not fetch the same content.


### Create a Gatsby app

Create a basic Gatsby application using the [Gatsby CLI](https://www.gatsbyjs.org/docs/gatsby-cli/).


```bash
gatsby new gatsby-app
```

### Configure Gatsby

Gatsby is a [Static Site Generator](https://www.staticgen.com/) and will fetch your content from Strapi at build time. You need to configure Gatsby to communicate with your Strapi application.


```bash
yarn add gatsby-source-strapi
```

  - Add the `gatsby-source-strapi` to the plugins section in the `gatsby-config.js` file:

```js
{
  resolve: "gatsby-source-strapi",
  options: {
    apiURL: "http://localhost:1337",
    contentTypes: [
      "restaurant",
      "category",
    ],
    queryLimit: 1000,
  },
},
```

### GET Request your collection type

Execute a GET request on the `restaurant` Collection Type in order to fetch all your restaurants.

Be sure that you activated the `find` permission for the `restaurant` Collection Type


*Request*

```graphql
query {
  allStrapiRestaurant {
    edges {
      node {
        strapiId
        name
        description
      }
    }
  }
}
```

*Response*

```json
{
  "data": {
    "allStrapiRestaurant": {
      "edges": [
        {
          "node": {
            "strapiId": 1,
            "name": "Biscotte Restaurant",
            "description": "Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers."
          }
        },
      ]
    }
  }
}
```

### Example

`./src/pages/index.js`

```js
import React from "react"

import { StaticQuery, graphql } from "gatsby"

const IndexPage = () => (
  <StaticQuery
      query={graphql`
        query {
          allStrapiRestaurant {
            edges {
              node {
                strapiId
                name
                description
              }
            }
          }
        }
      `}
      render={data => (
        <ul>
          { data.allStrapiRestaurant.edges.map(restaurant => <li key={restaurant.node.strapiId}>{restaurant.node.name}</li>) }
        </ul>
      )}
    />
)

export default IndexPage
```

Execute a GET request on the `category` Collection Type in order to fetch a specific category with all the associated restaurants.

Be sure that you activated the `findOne` permission for the `category` Collection Type

*Request*

```graphql
query  {
  strapiCategory(strapiId: {eq: 1}) {
    strapiId
    name
    restaurants {
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

`./src/pages/index.js`

```js
import React from "react"

import { StaticQuery, graphql } from "gatsby"

const IndexPage = () => (
  <StaticQuery
      query={graphql`
        query  {
          strapiCategory(strapiId: {eq: 1}) {
            id
            name
            restaurants {
              id
              name
              description
            }
          }
        }
      `}
      render={data => (
        <div>
          <h1>{ data.strapiCategory.name }</h1>
          <ul>
            { data.strapiCategory.restaurants.map(restaurant => <li key={restaurant.id}>{restaurant.name}</li>) }
          </ul>
        </div>
      )}
    />
)

export default IndexPage

```

## Conclusion

Here is how to request your Collection Types in Strapi using Gatsby.

Learn more about [GraphQL](../plugins/graphql.html)
