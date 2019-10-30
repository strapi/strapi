# Fetching external data

This guide will explain how to fetch data in an external service and use it in your app.

In this example we will see how to daily fetch Docker pull count and store it in database.

## Content Type settings

First we will have to create a Content Type. Let say the Content Type name will be `hit` and will have a `date` and a `count` attributes.

Your content type will look like this:

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
  const { data } = await axios.get(
    'https://hub.docker.com/v2/repositories/strapi/strapi/'
  );

  console.log(data);
};
```

Here in `data` we recieve all the data from the API. We will be interested by adding in our database the `pull_count` value.

## Create a `hit` entry

Now let's create the entry programatically.

**Path —** `./config/functions/docker.js`

```js
const axios = require('axios');

module.exports = async () => {
  const { data } = await axios.get(
    'https://hub.docker.com/v2/repositories/strapi/strapi/'
  );

  await strapi.query('hit').create({
    date: new Date(),
    count: data.pull_count,
  });
};
```

With this code, everytime this function will be called, that will fetch the `strapi/strapi` docker repo data and insert in the Strapi database the current pull count with the current date.

## Call the function

Here is how to call the function in your application `strapi.config.functions.docker()`

So lets execute this function everyday at 2am. For this we will use a [CRON tasks](../concepts/configurations.md#cron-tasks).

**Path —** `./config/functions/cron.js`

```js
module.exports = {
  '0 2 * * *': () => {
    strapi.config.functions.docker();
  },
};
```
