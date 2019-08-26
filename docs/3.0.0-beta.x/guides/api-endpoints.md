# API Endpoints

When you create a ContentType you will have a certain number of API endpoints available to interact with it.

As an example let's consider the `Post` ContentType for the next steps.

## `Post` ContentType

| Fields | Type   | Description        |
| :----- | :----- | ------------------ |
| title  | string | Post's title       |
| cover  | media  | Post's cover image |
| seo    | group  | Post's seo group   |

## `Seo` Group

| Fields  | Type   | Description    |
| :------ | :----- | -------------- |
| name    | string | Meta's name    |
| content | text   | Meta's content |

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

| Method | Path                             | Description         |
| :----- | :------------------------------- | :------------------ |
| GET    | [/posts](#get-posts)             | Get a list of posts |
| GET    | [/posts/count](#get-posts-count) | Count posts         |
| POST   | [/posts](#post-posts)            | Create a post       |
| GET    | [/posts/:id](#get-posts-id)      | Get a specific post |
| PUT    | [/posts/:id](#put-posts-id)      | Update a post       |
| DELETE | [/posts/:id](#delete-posts-id)   | Delete a post       |

</div>

---

## GET `/posts`

This endpoint returns the list of posts matching your filters. Youc an read more about filtering [here](./filters.md).

**Example request**

```js
GET http://localhost:1337/posts
```

**Example response**

```json
[
  {
    "id": "1",
    "title": "Post 1",
    "cover": {
      "id": "1",
      "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
      //...
    }
    // This is a group
    "seo": [
      {
        "id": "1",
        "name": "description",
        "content": "This is a press post about Strapi"
      },
      {
        "id": "2",
        "name": "keywords",
        "content": "post, article, news, press"
      }
    ]
  }
]
```

## GET `/posts/count`

**Example response**

```
1
```

## POST `/posts`

**Example request**

```js
POST http://localhost:1337/posts
```

```json
{
  "title": "Post 2",
  "cover": 1,
  "seo": [
    {
      "name": "title",
      "content": "Post 2"
    }
  ]
}
```

**Example response**

```json
  {
    "id": "1",
    "title": "Post 1",
    "cover": {
      "id": "1",
      "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
      //...
    }
    // This is a group
    "seo": [
      {
        "id": 3,
        "name": "title",
        "content": "Post 2"
      }
    ]
  }
```

## GET `/posts/:id`

## PUT `/posts/:id`

## DELETE `/posts/:id`
