# Queries

Strapi provides a utility function `strapi.query` to make database queries.

You can just call `strapi.query('modelName', 'pluginName')` to access the query API for any model.

These queries handle for you specific Strapi features like `groups`, `filters` and `search`.

## API Reference

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "find" id="find"

### `find`

This method returns a list of entries matching Strapi filters.
You can also pass a populate option to specify which relations you want to be populated.

#### Examples

**Find by id**:

```js
strapi.query('restaurant').find({ id: 1 });
```

**Find by in IN, with a limit**:

```js
strapi.query('restaurant').find({ _limit: 10, id_in: [1, 2] });
```

**Find by date orderBy name**:

```js
strapi
  .query('restaurant')
  .find({ date_gt: '2019-01-01T00:00:00Z', _sort: 'name:desc' });
```

**Find by id not in and populate a relation. Skip the first ten results**

```js
strapi
  .query('restaurant')
  .find({ id_nin: [1], _start: 10 }, ['category', 'category.name']);
```

:::

::: tab "findOne" id="findone"

### `findOne`

This method returns the first entry matching some basic params.
You can also pass a populate option to specify which relations you want to be populated.

#### Examples

**Find one by id**:

```js
strapi.query('restaurant').findOne({ id: 1 });
```

**Find one by name**:

```js
strapi.query('restaurant').findOne({ name: 'restaurant name' });
```

**Find one by name and creation_date**:

```js
strapi
  .query('restaurant')
  .findOne({ name: 'restaurant name', date: '2019-01-01T00:00:00Z' });
```

**Find one by id and populate a relation**

```js
strapi.query('restaurant').findOne({ id: 1 }, ['category', 'category.name']);
```

:::

::: tab "create" id="create"

### `create`

Creates an entry in the database and returns the entry.

#### Example

```js
strapi.query('restaurant').create({
  name: 'restaurant name',
  // this is a group field. the order is persisted in db.
  opening_hours: [
    {
      day_interval: 'Mon',
      opening_hour: '7:00 PM',
      closing_hour: '11:00 PM',
    },
    {
      day_interval: 'Tue',
      opening_hour: '7:00 PM',
      closing_hour: '11:00 PM',
    },
  ],
  // pass the id of a media to link it to the entry
  cover: 1,
  // automatically creates the relations when passing the ids in the field
  reviews: [1, 2, 3],
});
```

:::

::: tab "update" id="update"

### `update`

Updates an entry in the database and returns the entry.

#### Examples

**Update by id**

```js
strapi.query('restaurant').update(
  { id: 1 },
  {
    name: 'restaurant name',
    opening_hours: [
      {
        day_interval: 'Mon',
        opening_hour: '7:00 PM',
        closing_hour: '11:00 PM',
      },
      {
        day_interval: 'Tue',
        opening_hour: '7:00 PM',
        closing_hour: '11:00 PM',
      },
    ],
    // pass the id of a media to link it to the entry
    cover: 1,
    // automatically creates the relations when passing the ids in the field
    reviews: [1, 2, 3],
  }
);
```

When updating an entry with its groups beware that if you send the groups without any `id` the previous groups will be deleted and replaced. You can update the groups by sending their `id` with the rest of the fields:

**Update by id and update previous groups**

```js
strapi.query('restaurant').update(
  { id: 1 },
  {
    name: 'Mytitle',
    opening_hours: [
      {
        id: 2,
        day_interval: 'Mon',
        opening_hour: '7:00 PM',
        closing_hour: '11:00 PM',
      },
      {
        id: 1,
        day_interval: 'Tue',
        opening_hour: '7:00 PM',
        closing_hour: '11:00 PM',
      },
    ],
    // pass the id of a media to link it to the entry
    cover: 1,
    // automatically creates the relations when passing the ids in the field
    reviews: [1, 2, 3],
  }
);
```

**Partial update by name**

```js
strapi.query('restaurant').update(
  { title: 'specific name' },
  {
    title: 'restaurant name',
  }
);
```

:::

::: tab "delete" id="delete"

### `delete`

Deletes and entry and return its value before deletion.
You can delete multiple entries at once with the passed params.

#### Examples

**Delete one by id**

```js
strapi.query('restaurant').delete({ id: 1 });
```

**Delete multiple by field**

```js
strapi.query('restaurant').delete({ district: '_18th' });
```

:::

::: tab "count" id="count"

### `count`

Returns the count of entries matching Strapi filters.

#### Examples

**Count by district**

```js
strapi.query('restaurant').count({ district: '_1st' });
```

**Count by name contains**

```js
strapi.query('restaurant').count({ name_contains: 'food' });
```

**Count by date less than**

```js
strapi.query('restaurant').count({ date_lt: '2019-08-01T00:00:00Z' });
```

:::

::: tab "search" id="search"

### `search`

Returns entries based on a search on all fields allowing it. (this feature will return all entries on sqlite).

#### Examples

**Search first ten starting at 20**

```js
strapi
  .query('restaurant')
  .search({ _q: 'my search query', _limit: 10, _start: 20 });
```

**Search and sort**

```js
strapi
  .query('restaurant')
  .search({ _q: 'my search query', _limit: 100, _sort: 'date:desc' });
```

:::

::: tab "countSearch" id="countsearch"

### `countSearch`

Returns the total count of entries based on a search. (this feature will return all entries on sqlite).

#### Example

```js
strapi.query('restaurant').countSearch({ _q: 'my search query' });
```

:::

::::

## Custom Queries

When you want to customize your services or create new ones you will have to build your queries with the underlying ORM models.

To access the underlying model:

```js
strapi.query(modelName, plugin).model;
```

Then you can run any queries available on the model. You should refer to the specific ORM documentation for more details:

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "Bookshelf" id="bookshelf"

### Bookshelf

Documentation: [https://bookshelfjs.org/](https://bookshelfjs.org/)

**Example**

```js
const result = await strapi
  .query('restaurant')
  .model.query(qb => {
    qb.where('id', 1);
  })
  .fetch();

const fields = result.toJSON();
```

:::

::: tab "Mongoose" id="mongoose"

### Mongoose

Documentation: [https://mongoosejs.com/](https://mongoosejs.com/)

**Example**

```js
const result = strapi.query('restaurant').model.find({
  date: { $gte: '2019-01-01T00.00.00Z' },
});

const fields = result.toObject();
```

:::

::::
