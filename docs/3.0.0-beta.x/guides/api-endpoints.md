# API Endpoints

When you create a `ContentType` you will have a certain number of REST API endpoints available to interact with it.

As an example let's consider the `Post` ContentType for the next steps.

### `Post` ContentType

| Fields | Type   | Description        | Options      |
| :----- | :----- | ------------------ | ------------ |
| title  | string | Post's title       |              |
| cover  | media  | Post's cover image |              |
| seo    | group  | Post's seo group   | `repeatable` |

### `Seo` Group

| Fields  | Type   | Description    |
| :------ | :----- | -------------- |
| name    | string | Meta's name    |
| content | text   | Meta's content |

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

| Method | Path                             | Description         |
| :----- | :------------------------------- | :------------------ |
| GET    | [/posts](#get-posts)             | Get a list of posts |
| GET    | [/posts/count](#get-posts-count) | Count posts         |
| POST   | [/posts](#post-posts)            | Create a post       |
| GET    | [/posts/:id](#get-posts-id)      | Get a specific post |
| PUT    | [/posts/:id](#put-posts-id)      | Update a post       |
| DELETE | [/posts/:id](#delete-posts-id)   | Delete a post       |

</div>

## GET `/posts`

Returns the posts matching the query filters. You can read more about filtering [here](./filters.md).

**Example request**

```js
GET http://localhost:1337/posts
```

**Example response**

```json
[
  {
    "id": 1,
    "title": "Post 1",
    "cover": {
      "id": 1,
      "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
      //...
    },
    "seo": [
      {
        "id": 1,
        "name": "description",
        "content": "This is a press post about Strapi"
      },
      {
        "id": 2,
        "name": "keywords",
        "content": "post, article, news, press"
      }
    ]
  }
]
```

## GET `/posts/count`

Returns the count of posts matching the query filters. You can read more about filtering [here](./filters.md).

**Example response**

```
1
```

## POST `/posts`

Creates a post and returns its value.

**Example request**

```js
POST http://localhost:1337/posts
```

```json
{
  "title": "Post 1",
  "cover": 1,
  "seo": [
    {
      "name": "title",
      "content": "Post 1"
    }
  ]
}
```

**Example response**

```json
{
  "id": 1,
  "title": "Post 1",
  "cover": {
    "id": 1,
    "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
    //...
  },
  "seo": [
    {
      "id": 1,
      "name": "title",
      "content": "Post 1"
    }
  ]
}
```

## GET `/posts/:id`

Returns a post by id.

**Example request**

```js
GET http://localhost:1337/posts/1
```

**Example response**

```json
{
  "id": 1,
  "title": "Post 1",
  "cover": {
    "id": 1,
    "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
    //...
  },
  "seo": [
    {
      "id": 1,
      "name": "title",
      "content": "Post 1"
    }
  ]
}
```

## PUT `/posts/:id`

Partially updates a post by id and returns its value.
Fields that aren't sent in the query are not changed in the db. Send a `null` value if you want to clear them.

**Example request**

```js
PUT http://localhost:1337/posts/1
```

```json
{
  "title": "Post 1",
  "seo": [
    {
      // adding a new item
      "name": "description",
      "content": "Post 1 description meta"
    },
    {
      // editing one of the previous item by passing its id
      "id": 1,
      "name": "title",
      "content": "Post 1"
    }
  ]
}
```

**Example response**

```json
{
  "id": 1,
  "title": "Post 1",
  "cover": {
    "id": 1,
    "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
    //...
  },
  "seo": [
    {
      "id": 2,
      "name": "description",
      "content": "Post 1 description meta"
    },
    {
      "id": 1,
      "name": "title",
      "content": "Post 1"
    }
  ]
}
```

## DELETE `/posts/:id`

Deletes a post by id and returns its value.

**Example request**

```js
DELETE http://localhost:1337/posts/1
```

**Example response**

```json
{
  "id": 1,
  "title": "Post 1",
  "cover": {
    "id": 1,
    "url": "/uploads/3d89ba92f762433bbb75bbbfd9c13974.png"
    //...
  },
  "seo": [
    {
      "id": 2,
      "name": "description",
      "content": "Post 1 description meta"
    },
    {
      "id": 1,
      "name": "title",
      "content": "Post 1"
    }
  ]
}
```

::: tip
Whether you are using MongoDB or a SQL database you can use the field `id` as described in this documentation. It will be provided in both cases and work the same way.
:::

## GraphQL

When you are using the GraphQL plugin, all your `ContentTypes` will be generated in your Graphql schema and made accessible through queries and mutations.

If you are using `Groups`, they will be available as fields in the `ContentTypes` they are used in.

```graphql
type Post {
  title: String
  cover: UploadFile
  seo: [GroupSeo]
}

type GroupSeo {
  name: String
  content: String
}

type Query {
  post(id: ID!): Post
  posts(sort: String, limit: Int, start: Int, where: JSON): [Post]
}

type Mutation {
  createPost(input: createPostInput): createPostPayload
  updatePost(input: updatePostInput): updatePostPayload
  deletePost(input: deletePostInput): deletePostPayload
}
```

You can read more about the graphql plugin [here](./graphql.md).
