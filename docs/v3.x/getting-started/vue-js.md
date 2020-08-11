# Getting Started with Vue.js

This integration guide is following the [Getting started guide](../getting-started/quick-start.html). We assume that you have completed [Step 8](../getting-started/quick-start.html#_8-consume-the-content-type-s-api) and therefore can consume the API by browsing this [url](http://localhost:1337/restaurants).

If you haven't gone through the getting started guide, the way you request a Strapi API with [Vue.js](https://vuejs.org/) remains the same except that you will not fetch the same content.


### Create a Vue.js app

Create a basic Vue.js application using [Vue CLI](https://cli.vuejs.org).


```bash
vue create vue-app
```


### Use an HTTP client

Many HTTP clients are available but in this documentation we'll use [Axios](https://github.com/axios/axios) and [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)


:::: tabs

::: tab axios

```bash
yarn add axios
```

:::

::: tab fetch

No installation needed

:::

::::

### GET Request your collection type

Execute a GET request on the `restaurant` Collection Type in order to fetch all your restaurants.

Be sure that you activated the `find` permission for the `restaurant` Collection Type.


:::: tabs

::: tab axios

*Request*

```js
import axios from 'axios'

axios.get('http://localhost:1337/restaurants')
  .then(response => {
    console.log(response);
  })
```

:::

::: tab fetch

*Request*

```js
fetch("http://localhost:1337/restaurants", {
  method: "GET",
  headers: {
     'Content-Type': 'application/json'
  },
}).then(response => response.json())
  .then(data => console.log(data));
```

:::

*Response*

```json
[{
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
  "categories": [{
    "id": 2,
    "name": "French Food",
    "created_by": 1,
    "updated_by": 1,
    "created_at": "2020-07-31T11:36:23.164Z",
    "updated_at": "2020-07-31T11:36:23.172Z"
  }]
}]
```

::::

### Example

:::: tabs

::: tab axios

`./src/App.vue`

```js
<template>
  <div id="app">
    <div v-if="error">
      {{ error }}
    </div>
    <ul v-else>
      <li v-for="restaurant in restaurants" :key="restaurant.id">
        {{ restaurant.name }}
      </li>
    </ul>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'App',
  data () {
    return {
      restaurants: [],
      error: null
    }
  },
  async mounted () {
    try {
      const response = await axios.get('http://localhost:1337/restaurants')
      this.restaurants = response.data
    } catch (error) {
      this.error = error;
    }
  }
}
</script>
```

:::

::: tab fetch

`./src/App.vue`

```js
<template>
  <div id="app">
    <div v-if="error">
      {{ error }}
    </div>
    <ul v-else>
      <li v-for="restaurant in restaurants" :key="restaurant.id">
        {{ restaurant.name }}
      </li>
    </ul>
  </div>
</template>

<script>

export default {
  name: 'App',
  data () {
    return {
      restaurants: [],
      error: null,
      headers: {'Content-Type': 'application/json'}
    }
  },
  methods: {
    parseJSON: function (resp) {
      return (resp.json ? resp.json() : resp);
    },
    checkStatus: function (resp) {
      if (resp.status >= 200 && resp.status < 300) {
        return resp;
      }
      return this.parseJSON(resp).then((resp) => {
        throw resp;
      });
    }
  },
  async mounted () {
    try {
      const response = await fetch("http://localhost:1337/restaurants", {
        method: 'GET',
        headers: this.headers,
      }).then(this.checkStatus)
        .then(this.parseJSON);
        this.restaurants = response
    } catch (error) {
      this.error = error
    }
  }
}
</script>
```

:::

::::

### POST Request your collection type

Execute a POST request on the `restaurant` Collection Type in order to create a restaurant.

Be sure that you activated the `create` permission for the `restaurant` Collection Type and the `find` permission for the `category` Collection type.


:::: tabs

::: tab axios

*Request*

```js
import axios from 'axios'

axios.post('http://localhost:1337/restaurants', {
    name: 'Dolemon Sushi',
    description: 'Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious',
    categories: [
      3
    ]
  })
  .then(response => {
    console.log(response);
  })
```

:::

::: tab fetch

*Request*

```js
fetch('http://localhost:1337/restaurants', {
   method: 'POST',
   headers: {
      'Content-Type': 'application/json'
   },
   body: JSON.stringify({
     name: 'Dolemon Sushi',
     description: 'Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious',
     categories: [
       3
     ]
   })
 }).then(response => response.json())
   .then(data => console.log(data));
```

:::

*Response*

```json
{
    "id": 2,
    "name": "Dolemon Sushi",
    "description": "Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious",
    "created_by": null,
    "updated_by": null,
    "created_at": "2020-08-04T09:57:11.669Z",
    "updated_at": "2020-08-04T09:57:11.669Z",
    "categories": [{
      "id": 3,
      "name": "Japanese",
      "created_by": 1,
      "updated_by": 1,
      "created_at": "2020-07-31T11:36:23.164Z",
      "updated_at": "2020-07-31T11:36:23.172Z"
    }]
}
```

::::

### Example

:::: tabs

::: tab axios

`./src/App.vue`

```js
<template>
<div id="app">
  <div v-if="error">
    {{ error }}
  </div>

  <form id="form" v-on:submit="handleSubmit" v-else>
    <label for="name">Name</label>
    <input id="name" v-model="modifiedData.name" type="text" name="name">

    <label for="description">Description</label>
    <input id="description" v-model="modifiedData.description" type="text" name="description">

    <div>
      <br />
      Select categories
      <div v-for="category in allCategories" :key="category.id">
        <label>{{ category.name }}</label>
        <input
          type="checkbox"
          :value="category.id"
          v-model="modifiedData.categories"
          name="categories"
          :id="category.id"
        />
      </div>
    </div>

    <input type="submit" value="Submit">
  </form>

</div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'App',
  data() {
    return {
      allCategories: [],
      modifiedData: {
        name: '',
        description: '',
        categories: [],
      },
      error: null
    }
  },
  async mounted() {
    try {
      const response = await axios.get('http://localhost:1337/categories')
      this.allCategories = response.data;
    } catch (error) {
      this.error = error;
    }
  },
  methods: {
    handleSubmit: async function(e) {
      e.preventDefault();

      try {
        const response = await axios.post('http://localhost:1337/restaurants', this.modifiedData)
        console.log(response);
      } catch(error) {
        this.error = error;
      }
    }
  }
}
</script>
```

:::

::: tab fetch

`./src/App.vue`

```js
<template>
<div id="app">
  <div v-if="error">
    {{ error }}
  </div>

  <form id="form" v-on:submit="handleSubmit" v-else>
    <h3>Restaurants</h3>
    <br>

    <label for="name">Name</label>
    <input id="name" v-model="modifiedData.name" type="text" name="name">

    <label for="description">Description</label>
    <input id="description" v-model="modifiedData.description" type="text" name="description">
    <div>
      <br />
      <b>Select categories</b>
      <br>
      <div v-for="category in allCategories" :key="category.id">
        <label>{{ category.name }}</label>
        <input
          type="checkbox"
          :value="category.id"
          v-model="modifiedData.categories"
          name="categories"
          :id="category.id"
        />
      </div>
    </div>
    <br>

    <input type="submit" value="Submit">
  </form>

</div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      allCategories: [],
      modifiedData: {
        name: '',
        description: '',
        categories: [],
      },
      error: null,
      headers: {'Content-Type': 'application/json'}
    }
  },
  async mounted() {
    try {
      const allCategories = await fetch("http://localhost:1337/categories", {
          method: 'GET',
          headers: this.headers,
        }).then(this.checkStatus)
          .then(this.parseJSON);
          this.allCategories = allCategories
    } catch (error) {
      this.error = error
    }
  },
  methods: {
    parseJSON: function (resp) {
      return (resp.json ? resp.json() : resp);
    },
    checkStatus: function (resp) {
      if (resp.status >= 200 && resp.status < 300) {
        return resp;
      }
      return this.parseJSON(resp).then((resp) => {
        throw resp;
      });
    },
    handleSubmit: async function(e) {
      e.preventDefault();

      try {
        const response = await fetch('http://localhost:1337/restaurants', {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(this.modifiedData)
          }).then(this.checkStatus)
            .then(this.parseJSON);
            console.log(response);
      } catch (error) {
        this.error = error
      }
    }
  }
}
</script>
```

:::

::::

### PUT Request your collection type

Execute a PUT request on the `restaurant` Collection Type in order to update the category of a restaurant.

Be sure that you activated the `put` permission for the `restaurant` Collection Type.

:::: tabs

We consider that the id of your restaurant is `2`
and the id of your category is `3`

::: tab axios

*Request*

```js
import axios from 'axios'

axios.put('http://localhost:1337/restaurants/2', {
  categories: [
    3
  ]
})
.then(response => {
  console.log(response);
})
```

:::

::: tab fetch

*Request*

```js
fetch('http://localhost:1337/restaurants/2', {
  method: "PUT",
  headers: {
     'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    categories: [
      3
    ]
  })
})
.then(response => response.json())
.then(data => {
  console.log(data);
})
```

:::

*Response*

```json
{
  "id": 2,
  "name": "Dolemon Sushi",
  "description": "Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious",
  "created_by": null,
  "updated_by": null,
  "created_at": "2020-08-04T10:21:30.219Z",
  "updated_at": "2020-08-04T10:21:30.219Z",
  "categories": [{
    "id": 3,
    "name": "Japanese",
    "created_by": 1,
    "updated_by": 1,
    "created_at": "2020-08-04T10:24:26.901Z",
    "updated_at": "2020-08-04T10:24:26.911Z"
  }]
}
```

::::

## Conclusion

Here is how to request your Collection Types in Strapi using Vue.js. When you create a Collection Type or a Single Type you will have a certain number of REST API endpoints available to interact with.

We just used the GET, POST and PUT methods here but you can [get one entry](../content-api/api-endpoints.html#get-an-entry), [get how much entry you have](../content-api/api-endpoints.html#count-entries) and [delete](../content-api/api-endpoints.html#delete-an-entry) an entry too. Learn more about [API Endpoints](../content-api/api-endpoints.html#api-endpoints)
