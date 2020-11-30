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

Many HTTP clients are available but in this documentation we'll use [Axios](https://github.com/axios/axios) and [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

:::: tabs

::: tab axios

```bash
yarn add axios
```

:::

::: tab fetch

No installation needed.

:::

::::

### GET Request your collection type

Execute a `GET` request on the `restaurant` Collection Type in order to fetch all your restaurants.

Be sure that you activated the `find` permission for the `restaurant` Collection Type.

:::: tabs

::: tab axios

_Request_

```js
import axios from 'axios';

axios.get('http://localhost:1337/restaurants').then(response => {
  console.log(response);
});
```

:::

::: tab fetch

_Request_

```js
fetch('http://localhost:1337/restaurants', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then(response => response.json())
  .then(data => console.log(data));
```

:::

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
        "id": 1,
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

::::

### Example

:::: tabs

::: tab axios

`./pages/index.js`

```js
import axios from 'axios';

const Home = ({ restaurants, error }) => {
  if (error) {
    return <div>An error occured: {error.message}</div>;
  }
  return (
    <ul>
      {restaurants.map(restaurant => (
        <li key={restaurant.id}>{restaurant.name}</li>
      ))}
    </ul>
  );
};

Home.getInitialProps = async ctx => {
  try {
    const res = await axios.get('http://localhost:1337/restaurants');
    const restaurants = res.data;
    return { restaurants };
  } catch (error) {
    return { error };
  }
};

export default Home;
```

:::

::: tab fetch

`./pages/index.js`

```js
const Home = ({ restaurants, error }) => {
  if (error) {
    return <div>An error occured: {error.message}</div>;
  }
  return (
    <ul>
      {restaurants.map(restaurant => (
        <li key={restaurant.id}>{restaurant.name}</li>
      ))}
    </ul>
  );
};
Home.getInitialProps = async ctx => {
  try {
    // Parses the JSON returned by a network request
    const parseJSON = resp => (resp.json ? resp.json() : resp);
    // Checks if a network request came back fine, and throws an error if not
    const checkStatus = resp => {
      if (resp.status >= 200 && resp.status < 300) {
        return resp;
      }

      return parseJSON(resp).then(resp => {
        throw resp;
      });
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    const restaurants = await fetch('http://localhost:1337/restaurants', {
      method: 'GET',
      headers,
    })
      .then(checkStatus)
      .then(parseJSON);

    return { restaurants };
  } catch (error) {
    return { error };
  }
};

export default Home;
```

:::

::::

### POST Request your collection type

Execute a `POST` request on the `restaurant` Collection Type in order to create a restaurant.

Be sure that you activated the `create` permission for the `restaurant` Collection Type and the `find` permission for the `category` Collection type.

In this example a `japanese` category has been created which has the id: 3.

:::: tabs

::: tab axios

_Request_

```js
import axios from 'axios';

axios
  .post('http://localhost:1337/restaurants', {
    name: 'Dolemon Sushi',
    description: 'Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious',
    categories: [3],
  })
  .then(response => {
    console.log(response);
  });
```

:::

::: tab fetch

_Request_

```js
fetch('http://localhost:1337/restaurants', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Dolemon Sushi',
    description: 'Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious',
    categories: [3],
  }),
})
  .then(response => response.json())
  .then(data => console.log(data));
```

:::

_Response_

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
    {
      "id": 3,
      "name": "Japanese",
      "created_by": 1,
      "updated_by": 1,
      "created_at": "2020-07-31T11:36:23.164Z",
      "updated_at": "2020-07-31T11:36:23.172Z"
    }
  ]
}
```

::::

### Example

:::: tabs

::: tab axios

`./pages/index.js`

```js
import { useState } from 'react';
import axios from 'axios';

const Home = ({ allCategories, errorCategories }) => {
  const [modifiedData, setModifiedData] = useState({
    name: '',
    description: '',
    categories: [],
  });
  const [errorRestaurants, setErrorRestaurants] = useState(null);

  const handleChange = ({ target: { name, value } }) => {
    setModifiedData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:1337/restaurants', modifiedData);
      console.log(response);
    } catch (error) {
      setErrorRestaurants(error);
    }
  };

  const renderCheckbox = category => {
    const { categories } = modifiedData;
    const isChecked = categories.includes(category.id);
    const handleCheckboxChange = () => {
      if (!categories.includes(category.id)) {
        handleChange({ target: { name: 'categories', value: categories.concat(category.id) } });
      } else {
        handleChange({
          target: { name: 'categories', value: categories.filter(v => v !== category.id) },
        });
      }
    };
    return (
      <div key={category.id}>
        <label htmlFor={category.id}>{category.name}</label>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          name="categories"
          id={category.id}
        />
      </div>
    );
  };
  if (errorCategories) {
    return <div>An error occured (categories): {errorCategories.message}</div>;
  }
  if (errorRestaurants) {
    return <div>An error occured (restaurants): {errorRestaurants.message}</div>;
  }
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <h3>Restaurants</h3>
        <br />
        <label>
          Name:
          <input type="text" name="name" value={modifiedData.name} onChange={handleChange} />
        </label>
        <label>
          Description:
          <input
            type="text"
            name="description"
            value={modifiedData.description}
            onChange={handleChange}
          />
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
  );
};

Home.getInitialProps = async ctx => {
  try {
    const res = await axios.get('http://localhost:1337/categories');
    const allCategories = res.data;
    return { allCategories };
  } catch (errorCategories) {
    return { errorCategories };
  }
};

export default Home;
```

:::

::: tab fetch

`./pages/index.js`

```js
import { useState } from 'react';

// Parses the JSON returned by a network request
const parseJSON = resp => (resp.json ? resp.json() : resp);
// Checks if a network request came back fine, and throws an error if not
const checkStatus = resp => {
  if (resp.status >= 200 && resp.status < 300) {
    return resp;
  }
  return parseJSON(resp).then(resp => {
    throw resp;
  });
};
const headers = {
  'Content-Type': 'application/json',
};

const Home = ({ allCategories, errorCategories }) => {
  const [modifiedData, setModifiedData] = useState({
    name: '',
    description: '',
    categories: [],
  });
  const [errorRestaurants, setErrorRestaurants] = useState(null);

  const handleChange = ({ target: { name, value } }) => {
    setModifiedData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:1337/restaurants', {
        method: 'POST',
        headers,
        body: JSON.stringify(modifiedData),
      })
        .then(checkStatus)
        .then(parseJSON);
    } catch (error) {
      setErrorRestaurants(error);
    }
  };

  const renderCheckbox = category => {
    const { categories } = modifiedData;
    const isChecked = categories.includes(category.id);
    const handleCheckboxChange = () => {
      if (!categories.includes(category.id)) {
        handleChange({ target: { name: 'categories', value: categories.concat(category.id) } });
      } else {
        handleChange({
          target: { name: 'categories', value: categories.filter(v => v !== category.id) },
        });
      }
    };
    return (
      <div key={category.id}>
        <label htmlFor={category.id}>{category.name}</label>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          name="categories"
          id={category.id}
        />
      </div>
    );
  };

  if (errorCategories) {
    return <div>An error occured (categories): {errorCategories.message}</div>;
  }
  if (errorRestaurants) {
    return <div>An error occured (restaurants): {errorRestaurants.message}</div>;
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <h3>Restaurants</h3>
        <br />
        <label>
          Name:
          <input type="text" name="name" value={modifiedData.name} onChange={handleChange} />
        </label>
        <label>
          Description:
          <input
            type="text"
            name="description"
            value={modifiedData.description}
            onChange={handleChange}
          />
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
  );
};

Home.getInitialProps = async ctx => {
  try {
    const allCategories = await fetch('http://localhost:1337/categories', {
      method: 'GET',
      headers,
    })
      .then(checkStatus)
      .then(parseJSON);
    return { allCategories };
  } catch (errorCategories) {
    return { errorCategories };
  }
};
export default Home;
```

:::

::::

### PUT Request your collection type

Execute a `PUT` request on the `restaurant` Collection Type in order to update the category of a restaurant.

Be sure that you activated the `put` permission for the `restaurant` Collection Type.

:::: tabs

We consider that the id of your restaurant is `2`.
and the id of your category is `2`.

::: tab axios

_Request_

```js
import axios from 'axios';

axios
  .put('http://localhost:1337/restaurants/2', {
    categories: [2],
  })
  .then(response => {
    console.log(response);
  });
```

:::

::: tab fetch

_Request_

```js
fetch('http://localhost:1337/restaurants/2', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    categories: [2],
  }),
})
  .then(response => response.json())
  .then(data => {
    console.log(data);
  });
```

:::

_Response_

```json
{
  "id": 2,
  "name": "Dolemon Sushi",
  "description": "Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious",
  "created_by": null,
  "updated_by": null,
  "created_at": "2020-08-04T10:21:30.219Z",
  "updated_at": "2020-08-04T10:21:30.219Z",
  "categories": [
    {
      "id": 2,
      "name": "Brunch",
      "created_by": 1,
      "updated_by": 1,
      "created_at": "2020-08-04T10:24:26.901Z",
      "updated_at": "2020-08-04T10:24:26.911Z"
    }
  ]
}
```

::::

## Starter

- [Next.js Blog starter](https://github.com/strapi/strapi-starter-next-blog).
- [Next.js Corporate starter](https://github.com/strapi/strapi-starter-next-corporate).

## Conclusion

Here is how to request your Collection Types in Strapi using Next.js. When you create a Collection Type or a Single Type you will have a certain number of REST API endpoints available to interact with.

We just used the GET, POST and PUT methods here but you can [get one entry](../content-api/api-endpoints.html#get-an-entry), [get how much entry you have](../content-api/api-endpoints.html#count-entries) and [delete](../content-api/api-endpoints.html#delete-an-entry) an entry too. Learn more about [API Endpoints](../content-api/api-endpoints.html#api-endpoints).
