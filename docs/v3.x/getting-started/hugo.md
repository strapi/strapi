# Getting Started with Hugo

This integration guide is following the [Getting started guide](../getting-started/quick-start.html). We assume that you have completed [Step 8](../getting-started/quick-start.html#_8-consume-the-content-type-s-api) and therefore can consume the API by browsing this [url](http://localhost:1337/restaurants).

If you haven't gone through the getting started guide, the way you request a Strapi API with [Hugo](https://gohugo.io/) remains the same except that you will not fetch the same content.

### Create a Hugo app

Create a basic Hugo application. [Installation](https://gohugo.io/getting-started/installing/).

```bash
hugo new site hugo-app
```

### GET Request your collection type

Execute a GET request on the `restaurant` Collection Type in order to fetch all your restaurants.

Be sure that you activated the `find` permission for the `restaurant` Collection Type

_Request_

```html
{{ $restaurants := getJSON "http://localhost:1337/restaurants" }}
```

_Response_

```json
[
  {
    "id": 1,
    "name": "Biscotte Restaurant",
    "description": "Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers.",
    "created_by": {
      "id": 1,
      "firstname": "Paul",
      "lastname": "Bocuse",
      "username": null
    },
    "updated_by": {
      "id": 1,
      "firstname": "Paul",
      "lastname": "Bocuse",
      "username": null
    },
    "created_at": "2020-07-31T11:37:16.964Z",
    "updated_at": "2020-07-31T11:37:16.975Z",
    "categories": [
      {
        "id": 2,
        "name": "French Food",
        "created_by": 1,
        "updated_by": 1,
        "created_at": "2020-07-31T11:36:23.164Z",
        "updated_at": "2020-07-31T11:36:23.172Z"
      }
    ]
  }
]
```

### Example

`./layouts/index.html`

```html
<div class="restaurants">
  <ul>
    {{ $restaurants := getJSON "http://localhost:1337/restaurants" }} {{ range $restaurants }}
    <li>{{ .name }}</li>
    {{ end }}
  </ul>
</div>
```

Execute a GET request on the `category` Collection Type in order to fetch a specific category with all the associated restaurants.

Be sure that you activated the `findOne` permission for the `category` Collection Type

_Request_

```html
{{ $category := getJSON "http://localhost:1337/categories/1" }}
```

_Response_

```json
{
  "id": 1,
  "name": "French Food",
  "created_by": {
    "id": 1,
    "firstname": "Paul",
    "lastname": "Bocuse",
    "username": null
  },
  "updated_by": {
    "id": 1,
    "firstname": "Paul",
    "lastname": "Bocuse",
    "username": null
  },
  "created_at": "2020-07-31T11:36:23.164Z",
  "updated_at": "2020-07-31T11:36:23.172Z",
  "restaurants": [
    {
      "id": 1,
      "name": "Biscotte Restaurant",
      "description": "Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers.",
      "created_by": 1,
      "updated_by": 1,
      "created_at": "2020-07-31T11:37:16.964Z",
      "updated_at": "2020-07-31T11:37:16.975Z"
    }
  ]
}
```

### Example

`./layouts/index.html`

```js
<div class="restaurants">
  {{ $category := getJSON "http://localhost:1337/categories/1" }}
  <h1>{{ $category.name }}</h1>
  <ul>
    {{ range $category.restaurants }}
        <li>{{ .name }}</li>
    {{ end }}
  </ul>
</div>
```

## Conclusion

Here is how to request your Collection Types in Strapi using Hugo.
Learn more about Hugo with their [official documentation](https://gohugo.io/documentation/)
