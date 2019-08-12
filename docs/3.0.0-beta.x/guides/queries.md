# Queries

Strapi provides a utility function `strapi.query` to make database queries.

You can just call `strapi.query(modelName, pluginName)` to access the query API for any model.

Those queries handle for you specific Strapi features like `groups` `filters` and `search`.

## API Reference

### `findOne`

This method returns the first entry matching some basic params.
You can also pass a populate option to specify which relations you want to be populated.

#### Examples

**Find one by id**:

```js
strapi.query('post').findOne({ id: 1 });
```

**Find one by title**:

```js
strapi.query('post').findOne({ title: 'my title' });
```

**Find one by title and creation_date**:

```js
strapi
  .query('post')
  .findOne({ title: 'my title', created_at: '2019-01-01T00:00:00.000Z' });
```

**Find one by id and populate a relation**

```js
strapi.query('post').findOne({ id: 1 }, ['tag', 'tag.picture']);
```

### `find`

This method returns a list of entries matching Strapi filters.
You can also pass a populate option to specify which relations you want to be populated.

#### Examples

**Find by id**:

```js
strapi.query('post').find({ id: 1 });
```

**Find by in IN, with a limit**:

```js
strapi.query('post').find({ _limit: 10, id_in: [1, 2] });
```

**Find by date orderBy title**:

```js
strapi
  .query('post')
  .find({ date_gt: '2019-01-01T00:00:00.000Z', _sort: 'title:desc' });
```

**Find by id not in and populate a relation. Skip the first ten results**

```js
strapi.query('post').find({ id_nin: [1], _start: 10 }, ['tag', 'tag.picture']);
```

### `create`

Creates an entry in the database and returns the entry.

#### Example

```js
strapi.query('post').create({
  title: 'Mytitle',
  // this is a group field. the order is persisted in db.
  seo: [
    {
      metadata: 'description',
      value: 'My description',
    },
    {
      metadata: 'keywords',
      value: 'someKeyword,otherKeyword',
    },
  ],
  // pass the id of a media to link it to the entry
  picture: 1,
  // automatically creates the relations when passing the ids in the field
  tags: [1, 2, 3],
});
```

### `update`

Updates an entry in the database and returns the entry.

#### Examples

**Update by id**

```js
strapi.query('post').update(
  { id: 1 },
  {
    title: 'Mytitle',
    seo: [
      {
        metadata: 'description',
        value: 'My description',
      },
      {
        metadata: 'keywords',
        value: 'someKeyword,otherKeyword',
      },
    ],
    // pass the id of a media to link it to the entry
    picture: 1,
    // automatically creates the relations when passing the ids in the field
    tags: [1, 2, 3],
  }
);
```

When updating an entry with its groups beware that if you send the groups without any `id` the previous groups will be deleted and replaced. You can update the groups by sending there `id` :

**Update by id and update previous groups**

```js
strapi.query('post').update(
  { id: 1 },
  {
    title: 'Mytitle',
    seo: [
      {
        id: 2
        metadata: 'keywords',
        value: 'someKeyword,otherKeyword',
      },
      {
        id: 1
        metadata: 'description',
        value: 'My description',
      }
    ],
    // pass the id of a media to link it to the entry
    picture: 1,
    // automatically creates the relations when passing the ids in the field
    tags: [1, 2, 3],
  }
);
```

**Partial update by title**

```js
strapi.query('post').update(
  { title: 'specific title' },
  {
    title: 'Mytitle',
  }
);
```

### `delete`

Deletes and entry and return it's value before deletion.
You can delete multiple entries at once with the passed params.

#### Examples

**Delete one by id**

```js
strapi.query('post').delete({ id: 1 });
```

**Delete multiple by field**

```js
strapi.query('post').delete({ lang: 'en' });
```

### `count`

### `search`

### `countSearch`

## Custom Queries

In Strapi's [core services](./services.md#core-services) you can see we call a `strapi.query` function.

When customizing your model services you might want to implement some custom database queries. directly with the underlying ORM (bookshelf or mongoose).

To achieve that you can take some inspiration from the current code in the ORM queries utils.

### Bookshelf

You can see the current implementation of bookshelf queries [here](https://github.com/strapi/strapi/tree/master/packages/strapi-hook-bookshelf/lib/queries.js)

### Mongoose`

You can see the current implementation of mongoose queries [here](https://github.com/strapi/strapi/tree/master/packages/strapi-hook-mongoose/lib/queries.js)
