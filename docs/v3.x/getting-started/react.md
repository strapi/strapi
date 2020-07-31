# Getting Started with React

This integration guide is the following of the [Getting started](../getting-started/quick-start.html). We assume that you have completed the [Step 8](../getting-started/quick-start.html#_8-consume-the-content-type-s-api) and therefore can consume the API by browsing this [url](http://localhost:1337/restaurants).

If you don't come from the Getting started, the way you request a Strapi API with [React](https://reactjs.org/) remains the same except that you will not fetch the same content.


### Create a React app

Create a basic React application using [create-react-app](https://reactjs.org/docs/create-a-new-react-app.html).


:::: tabs

::: tab yarn

```bash
yarn create react-app react-app
```

:::

::: tab npx

```bash
npx create-react-app react-app
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

Execute a GET request on the `restaurant` Collection Type. 

:::: tabs

::: tab axios

```js
axios.get('http://localhost:1337/restaurants')
  .then(response => {
    // handle success
    console.log(response);
  })
  .catch(error => {
    // handle error
    console.log(error);
  })
  .then(function () {
    // always executed
  });

// response = [{"id":1,"name":"Biscotte Restaurant","description":"Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers.","created_by":{"id":1,"firstname":"Paul","lastname":"Bocuse","username":null},"updated_by":{"id":1,"firstname":"Paul","lastname":"Bocuse","username":null},"created_at":"2020-07-31T11:37:16.964Z","updated_at":"2020-07-31T11:37:16.975Z","categories":[{"id":2,"name":"French Food","created_by":1,"updated_by":1,"created_at":"2020-07-31T11:36:23.164Z","updated_at":"2020-07-31T11:36:23.172Z"}]}]
```

:::

::: tab fetch

```js
fetch("http://localhost:1337/restaurants")
  .then(response => response.json())
  .then(data => console.log(data));

// data = [{"id":1,"name":"Biscotte Restaurant","description":"Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers.","created_by":{"id":1,"firstname":"Paul","lastname":"Bocuse","username":null},"updated_by":{"id":1,"firstname":"Paul","lastname":"Bocuse","username":null},"created_at":"2020-07-31T11:37:16.964Z","updated_at":"2020-07-31T11:37:16.975Z","categories":[{"id":2,"name":"French Food","created_by":1,"updated_by":1,"created_at":"2020-07-31T11:36:23.164Z","updated_at":"2020-07-31T11:36:23.172Z"}]}]
```

:::

::::

### Examples

:::: tabs

::: tab axios

`./src/App.js`

```js
import React from 'react';
import axios from "axios"

class App extends React.Component {

  state = {
    restaurants: []
  }

  componentDidMount() {
    axios.get('http://localhost:1337/restaurants')
      .then(response => {
        const restaurants = response.data;
        this.setState({ restaurants });
      })
      .catch(function (error) {
        console.log(error);
      })
      .then(function () {
      });
  }

  render() {
    return (
      <div className="App">
        <ul>
          { this.state.restaurants.map(restaurant => <li key={restaurant.id}>{restaurant.name}</li>)}
        </ul>
      </div>
    );
  }
}

export default App;
```

:::

::: tab fetch

`./src/App.js`

```js
import React from 'react';

class App extends React.Component {

  state = {
    restaurants: []
  }

  componentDidMount() {
    fetch("http://localhost:1337/restaurants")
      .then(response => response.json())
      .then(data => {
        const restaurants = data;
        this.setState({ restaurants });
      })
  }

  render() {
    return (
      <div className="App">
        <ul>
          { this.state.restaurants.map(restaurant => <li key={restaurant.id}>{restaurant.name}</li>)}
        </ul>
      </div>
    );
  }
}

export default App;
```

:::

::::

Here is how to request your Collection Types in Strapi using React. When you create a Collection Type or a Single Type you will have a certain number of REST API endpoints available to interact with.

We just used the GET method on our restaurants in order to fetch them but you can [get one entry](../content-api/api-endpoints.html#get-an-entry), [create](content-api/api-endpoints.html#create-an-entry), [update](../content-api/api-endpoints.html#update-an-entry) or [delete](../content-api/api-endpoints.html#delete-an-entry) entry from your React client. Learn more about [API Endpoints](../content-api/api-endpoints.html#api-endpoints)
