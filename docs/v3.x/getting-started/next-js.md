# Getting Started with Next.js

This integration guide is following the [Getting started guide](../getting-started/quick-start.html). We assume that you have completed [Step 8](../getting-started/quick-start.html#_8-consume-the-content-type-s-api) and therefore can consume the API by browsing this [url](http://localhost:1337/restaurants).

If you haven't gone through the getting started guide, the way you request a Strapi API with [Next.js](https://nextjs.org/) remains the same except that you will not fetch the same content.


### Create a Next.js app

Create a basic Next.js application.

:::: tabs

::: tab yarn

```bash
yarn create next-app nextjs-app
```

:::

::: tab npx

```bash
npx create-next-app nextjs-app
```

:::

::::

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
axios.get('http://localhost:1337/restaurants')
```

:::

::: tab fetch

*Request*

```js
fetch("http://localhost:1337/restaurants")
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

`./pages/index.js`

```js
import axios from 'axios'

const Home = ({ restaurants, error }) => {
  if (error) {
    return <div>An error occured: {error.message}</div>
  }
  return (
    <ul>
      {restaurants.map(restaurant => <li key={restaurant.id}>{restaurant.name}</li>)}
    </ul>
  )
}

Home.getInitialProps = async (ctx) => {
  try {
    const res = await axios('http://localhost:1337/restaurants')
    const restaurants = await res
    return { restaurants: restaurants.data }
  } catch (error) {
    return { error: error }
  }
}

export default Home
```

:::

::: tab fetch

`./pages/index.js`

```js
import axios from 'axios'

const Home = ({ restaurants, error }) => {
  if (error) {
    return <div>An error occured: {error.message}</div>
  }
  return (
    <ul>
      {restaurants.map(restaurant => <li key={restaurant.id}>{restaurant.name}</li>)}
    </ul>
  )
}

Home.getInitialProps = async (ctx) => {
  try {
    const res = await fetch('http://localhost:1337/restaurants')
    const restaurants = await res.json()
    return { restaurants: restaurants }
  } catch (error) {
    return { error: error }
  }
}

export default Home
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
axios.post('http://localhost:1337/restaurants', {
    name: 'Dolemon Sushi',
    description: 'Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious'
  })
  .then(response => {
    console.log(response);
  })
  .catch(error => {
    console.log(error);
  });
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
     description: 'Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious'
   })
 }).then(response => {
   return response.json();
 }).then(data => {
   console.log(data);
 }).catch(error => {
   console.error(error);
 });
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
    "categories": [
    ]
}
```

::::

### Example

:::: tabs

::: tab axios

`./pages/index.js`

```js
import { useState } from 'react'
import axios from 'axios'

const Home = ({ allCategories, error }) => {

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState([])

  const handleSubmit = (e) =>  {
    axios.post('http://localhost:1337/restaurants', {
      name: name,
      description: description,
      categories: categories
    }).then(response => {
        console.log(response);
      })
      .catch(error => {
        console.log(error);
      });
    e.preventDefault();
  }

  const handleInputChange = ({ target: { name, value } }) => {
    setCategories(prev => ({
      [name]: value
    }));
  };

  const renderCheckbox = category => {
    const isChecked = categories.includes(category.id);
    const handleChange = () => {
      if (!categories.includes(category.id)) {
        setCategories(categories.concat(category.id))
      } else {
        setCategories(categories.filter(v => v !== category.id))
      }
    };

    return (
      <div key={category.id}>
        <label htmlFor={category.id}>{category.name}</label>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleChange}
          name="categories"
          id={category.id}
        />
      </div>
    );
  };

  if (error) {
    return <div>An error occured: {error.message}</div>
  }
  return (
    <div>
      <form onSubmit={handleSubmit}>
      <h3>Restaurants</h3>
      <br />
         <label>
           Name:
           <input type="text" name="name" value={name} onChange={e => setName(e.target.value)} />
         </label>
         <label>
           Description:
           <input type="text" name="description" value={description} onChange={e => setDescription(e.target.value)} />
         </label>
         <div>
          <br />
          <b>Select categories</b>
          <br />
           {allCategories.map(renderCheckbox)}
         </div>
         <br />
         <button type="submit">Submit</button>
          </form>
    </div>
  )
}

Home.getInitialProps = async (ctx) => {
  try {
    const res = await axios('http://localhost:1337/categories')
    const categories = await res
    return { allCategories: categories.data }
  } catch (error) {
    return { error: error }
  }
}

export default Home
```

:::

::: tab fetch

`./pages/index.js`

```js
import { useState } from 'react'

const Home = ({ allCategories, error }) => {

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState([])

  const handleSubmit = (e) =>  {
    fetch('http://localhost:1337/restaurants', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        description: description,
        categories: categories
      })
    }).then(response => response.json())
      .then(data => {
        console.log(data);
      })
      .catch(error => {
        console.log(error);
      });
    e.preventDefault();
  }

  const handleInputChange = ({ target: { name, value } }) => {
    setCategories(prev => ({
      [name]: value
    }));
  };

  const renderCheckbox = category => {
    const isChecked = categories.includes(category.id);
    const handleChange = () => {
      if (!categories.includes(category.id)) {
        setCategories(categories.concat(category.id))
      } else {
        setCategories(categories.filter(v => v !== category.id))
      }
    };

    return (
      <div key={category.id}>
        <label htmlFor={category.id}>{category.name}</label>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleChange}
          name="categories"
          id={category.id}
        />
      </div>
    );
  };

  if (error) {
    return <div>An error occured: {error.message}</div>
  }
  return (
    <div>
      <form onSubmit={handleSubmit}>
      <h3>Restaurants</h3>
      <br />
         <label>
           Name:
           <input type="text" name="name" value={name} onChange={e => setName(e.target.value)} />
         </label>
         <label>
           Description:
           <input type="text" name="description" value={description} onChange={e => setDescription(e.target.value)} />
         </label>
         <div>
          <br />
          <b>Select categories</b>
          <br />
           {allCategories.map(renderCheckbox)}
         </div>
         <br />
         <button type="submit">Submit</button>
          </form>
    </div>
  )
}

Home.getInitialProps = async (ctx) => {
  try {
    const res = await fetch('http://localhost:1337/categories').then(response => response.json())
      .then(data => {
        return data
      })
      .catch(error => {
        console.log(error);
      });
    const categories = await res
    return { allCategories: categories }
  } catch (error) {
    return { error: error }
  }
}

export default Home
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
axios.put('http://localhost:1337/restaurants/2', {
  categories: [{
    id: 3
  }]
})
.then(response => {
  console.log(response);
})
.catch(error => {
  console.log(error);
});
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
    categories: [{
      id: 3
    }]
  })
})
.then(response => response.json())
.then(data => {
  console.log(data);
})
.catch((error) => {
  console.error(error);
});
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

Here is how to request your Collection Types in Strapi using Next.js. When you create a Collection Type or a Single Type you will have a certain number of REST API endpoints available to interact with.

We just used the GET, POST and PUT methods here but you can [get one entry](../content-api/api-endpoints.html#get-an-entry), [get how much entry you have](../content-api/api-endpoints.html#count-entries) and [delete](../content-api/api-endpoints.html#delete-an-entry) an entry too. Learn more about [API Endpoints](../content-api/api-endpoints.html#api-endpoints)
