# API Endpoints

When you create a `Content Type` you will have a certain number of **REST API endpoints** available to interact with it.

As an **example** let's consider the `Restaurant` as a **Content Type** and `Openning_hours` as a **Group** for the next steps.

:::: tabs

::: tab "Content Type"

### `Restaurant` Content Type

| Fields        | Type   | Description                      | Options      |
| :------------ | :----- | :------------------------------- | :----------- |
| name          | string | Restaurant's title               |              |
| cover         | media  | Restaurant's cover image         |              |
| opening_hours | group  | Restaurant's opening hours group | `repeatable` |

:::

::: tab Group

### `Opening_hours` Group

| Fields       | Type   | Description         |
| :----------- | :----- | :------------------ |
| day_interval | string | Meta's day interval |
| opening_hour | string | Meta's opening hour |
| closing_hour | string | Meta's closing hour |

:::

::::

## Endpoints

Here is the list of endpoints generated for each of your **Content Types**

<style lang="stylus">
#endpoint-table
  table
    display table
    width 100%

  tr
    border none
    &:nth-child(2n)
      background-color white

  tbody
    tr
      border-top 1px solid #dfe2e5

  th, td
    border none
    padding 1.2em 1em
    border-right 1px solid #dfe2e5
    &:last-child
      border-right none


</style>

<div id="endpoint-table">

| Method | Path                                            | Description                          |
| :----- | :---------------------------------------------- | :----------------------------------- |
| GET    | [/{content-type}](#get-restaurants)             | Get a list of {content-type} entries |
| GET    | [/{content-type}/count](#get-restaurants-count) | Count {content-type} entries         |
| POST   | [/{content-type}](#post-restaurants)            | Create a {content-type} entry        |
| GET    | [/{content-type}/:id](#get-restaurants-id)      | Get a specific {content-type} entry  |
| DELETE | [/{content-type}/:id](#delete-restaurants-id)   | Delete a {content-type} entry        |
| PUT    | [/{content-type}/:id](#put-restaurants-id)      | Update a {content-type} entry        |

</div>

### Here some Content Type examples

:::: tabs

::: tab Restaurant

`Restaurant` **Content Type**

<div id="endpoint-table">

| Method | Path               | Description               |
| :----- | :----------------- | :------------------------ |
| GET    | /restaurants       | Get a list of restaurants |
| GET    | /restaurants/count | Count restaurants         |
| POST   | /restaurants       | Create a restaurant       |
| GET    | /restaurants/:id   | Get a specific restaurant |
| DELETE | /restaurants/:id   | Delete a restaurant       |
| PUT    | /restaurants/:id   | Update a restaurant       |

</div>

:::

::: tab Article

`Article` **Content Type**

<div id="endpoint-table">

| Method | Path            | Description            |
| :----- | :-------------- | :--------------------- |
| GET    | /articles       | Get a list of articles |
| GET    | /articles/count | Count articles         |
| POST   | /articles       | Create a article       |
| GET    | /articles/:id   | Get a specific article |
| DELETE | /articles/:id   | Delete a article       |
| PUT    | /articles/:id   | Update a article       |

</div>

:::

::: tab Product

`Product` **Content Type**

<div id="endpoint-table">

| Method | Path            | Description            |
| :----- | :-------------- | :--------------------- |
| GET    | /products       | Get a list of products |
| GET    | /products/count | Count products         |
| POST   | /products       | Create a product       |
| GET    | /products/:id   | Get a specific product |
| DELETE | /products/:id   | Delete a product       |
| PUT    | /products/:id   | Update a product       |

</div>

:::

::: tab Category

`Category` **Content Type**

<div id="endpoint-table">

| Method | Path              | Description              |
| :----- | :---------------- | :----------------------- |
| GET    | /categories       | Get a list of categories |
| GET    | /categories/count | Count categories         |
| POST   | /categories       | Create a category        |
| GET    | /categories/:id   | Get a specific category  |
| DELETE | /categories/:id   | Delete a category        |
| PUT    | /categories/:id   | Update a category        |

</div>

:::

::: tab Tag

`Tag` **Content Type**

<div id="endpoint-table">

| Method | Path        | Description        |
| :----- | :---------- | :----------------- |
| GET    | /tags       | Get a list of tags |
| GET    | /tags/count | Count tags         |
| POST   | /tags       | Create a tag       |
| GET    | /tags/:id   | Get a specific tag |
| DELETE | /tags/:id   | Delete a tag       |
| PUT    | /tags/:id   | Update a tag       |

</div>

:::

::::

## Get entries

Returns entries matching the query filters. You can read more about parameters [here](./parameters.md).

**Example request**

```js
GET http://localhost:1337/restaurants
```

**Example response**

```json
[
  {
    "id": 1,
    "name": "Restaurant 1",
    "cover": {
      "id": 1,
      "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
      //...
    },
    "opening_hours": [
      {
        "id": 1,
        "day_interval": "Tue - Sat",
        "opening_hour": "7:30 PM",
        "closing_hour": "10:00 PM"
      }
      //...
    ]
  }
]
```

## Count entries

Returns the count of entries matching the query filters. You can read more about parameters [here](./parameters.md).

**Example request**

```js
GET http://localhost:1337/restaurants/count
```

**Example response**

```
1
```

## Create an entry

Creates an entry and returns its value.

**Example request**

```js
POST http://localhost:1337/restaurants
```

```json
{
  "title": "Restaurant 1",
  "cover": 1,
  "opening_hours": [
    {
      "day_interval": "Tue - Sat",
      "opening_hour": "7:30 PM",
      "closing_hour": "10:00 PM"
    }
  ]
}
```

**Example response**

```json
{
  "id": 1,
  "title": "restaurant 1",
  "cover": {
    "id": 1,
    "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
    //...
  },
  "opening_hours": [
    {
      "id": 1,
      "day_interval": "Tue - Sat",
      "opening_hour": "7:30 PM",
      "closing_hour": "10:00 PM"
    }
  ]
}
```

## Get an entry

Returns an entry by id.

**Example request**

```js
GET http://localhost:1337/restaurants/1
```

**Example response**

```json
{
  "id": 1,
  "title": "Restaurant 1",
  "cover": {
    "id": 1,
    "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
    //...
  },
  "opening_hours": [
    {
      "id": 1,
      "day_interval": "Tue - Sat",
      "opening_hour": "7:30 PM",
      "closing_hour": "10:00 PM"
    }
  ]
}
```

## Update an entry

Partially updates an entry by id and returns its value.
Fields that aren't sent in the query are not changed in the db. Send a `null` value if you want to clear them.

**Example request**

```js
PUT http://localhost:1337/restaurants/1
```

```json
{
  "title": "Restaurant 1",
  "opening_hours": [
    {
      // adding a new item
      "day_interval": "Sun",
      "opening_hour": "7:30 PM",
      "closing_hour": "10:00 PM"
    },
    {
      // editing one of the previous item by passing its id
      "id": 1,
      "day_interval": "Mon - Sat",
      "opening_hour": "7:30 PM",
      "closing_hour": "10:00 PM"
    }
  ]
}
```

**Example response**

```json
{
  "id": 1,
  "title": "Restaurant 1",
  "cover": {
    "id": 1,
    "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
    //...
  },
  "opening_hours": [
    {
      "id": 1,
      "day_interval": "Mon - Sat",
      "opening_hour": "7:30 PM",
      "closing_hour": "10:00 PM"
    },
    {
      "id": 2,
      "day_interval": "Sun",
      "opening_hour": "7:30 PM",
      "closing_hour": "10:00 PM"
    }
  ]
}
```

## Delete an entry

Deletes an entry by id and returns its value.

**Example request**

```js
DELETE http://localhost:1337/restaurants/1
```

**Example response**

```json
{
  "id": 1,
  "title": "Restaurant 1",
  "cover": {
    "id": 1,
    "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
    //...
  },
  "opening_hours": [
    {
      "id": 1,
      "day_interval": "Mon - Sat",
      "opening_hour": "7:30 PM",
      "closing_hour": "10:00 PM"
    },
    {
      "id": 2,
      "day_interval": "Sun",
      "opening_hour": "7:30 PM",
      "closing_hour": "10:00 PM"
    }
  ]
}
```

::: tip
Whether you are using MongoDB or a SQL database you can use the field `id` as described in this documentation. It will be provided in both cases and work the same way.
:::
