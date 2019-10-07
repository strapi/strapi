# API Endpoints

When you create a `Content Type` you will have a certain number of REST API endpoints available to interact with it.

As an example let's consider the `Restaurant` Content Type for the next steps.

### `Restaurant` Content Type

| Fields        | Type   | Description                      | Options      |
| :------------ | :----- | :------------------------------- | :----------- |
| name          | string | Restaurant's title               |              |
| cover         | media  | Restaurant's cover image         |              |
| opening_hours | group  | Restaurant's opening hours group | `repeatable` |

### `Opening_hours` Group

| Fields       | Type   | Description         |
| :----------- | :----- | :------------------ |
| day_interval | string | Meta's day interval |
| opening_hour | string | Meta's opening hour |
| closing_hour | string | Meta's closing hour |

---

## Endpoints

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

| Method | Path                                         | Description                |
| :----- | :------------------------------------------- | :------------------------- |
| GET    | [/restaurants](#get-restaurants)             | Get a list of restaurants  |
| GET    | [/restaurants/count](#get-restaurants-count) | Count restaurants          |
| POST   | [/restaurants](#post-restaurants)            | Create a restaurant        |
| GET    | [/restaurants/:id](#get-restaurants-id)      | Get a specific restraurant |
| DELETE | [/restaurants/:id](#delete-restaurants-id)   | Delete a restaurant        |
| PUT    | [/restaurants/:id](#put-restaurants-id)      | Update a restaurant        |

</div>

## GET `/restaurants`

Returns the restaurants matching the query filters. You can read more about parameters [here](./parameters.md).

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

## GET `/restaurants/count`

Returns the count of restaurants matching the query filters. You can read more about parameters [here](./parameters.md).

**Example response**

```
1
```

## POST `/restaurants`

Creates a restaurant and returns its value.

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

## GET `/restaurants/:id`

Returns a restaurant by id.

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

## PUT `/restaurants/:id`

Partially updates a restaurant by id and returns its value.
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

## DELETE `/restaurants/:id`

Deletes a restaurant by id and returns its value.

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
