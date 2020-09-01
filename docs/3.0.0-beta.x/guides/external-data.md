# Fetching external data

This guide explains how to fetch data from an external service to use it in your app.

In this example we will see how to daily fetch Docker pull count to store the result in your database.

## Content Type settings

First, we need to create a Content Type, in this example we will call it `hit` with a `date` and `count` attribute.

Your Content Type should look like this:

**Path —** `./api/hit/models/Hit.settings.json`

```json
{
  "connection": "default",
  "collectionName": "hits",
  "info": {
    "name": "hit",
    "description": ""
  },
  "options": {
    "increments": true,
    "timestamps": true,
    "comment": ""
  },
  "attributes": {
    "count": {
      "type": "integer"
    },
    "date": {
      "type": "date"
    }
  }
}
```

## Fetch the data

Now we will create a function that will be usable everywhere in your strapi application.

**Path —** `./config/functions/docker.js`

```js
const axios = require('axios');

module.exports = async () => {
  const { data } = await axios.get('https://hub.docker.com/v2/repositories/strapi/strapi/');

  console.log(data);
};
```

`data` contains all the data received from the Docker Hub API. What we want here is to add the `pull_count` value in your database.

## Create a `hit` entry

let's programmatically create the entry.

**Path —** `./config/functions/docker.js`

```js
const axios = require('axios');

module.exports = async () => {
  const { data } = await axios.get('https://hub.docker.com/v2/repositories/strapi/strapi/');

  await strapi.query('hit').create({
    date: new Date(),
    count: data.pull_count,
  });
};
```

With this code, everytime this function is called it will fetch the docker repo's data and insert the current `pull_count` with the corresponding date in your Strapi database.

## Call the function

Here is how to call the function in your application `strapi.config.functions.docker()`

So let's execute this function everyday at 2am. For this we will use a [CRON tasks](../concepts/configurations.md#cron-tasks).

**Path —** `./config/functions/cron.js`

```js
module.exports = {
  '0 2 * * *': () => {
    strapi.config.functions.docker();
  },
};
```
