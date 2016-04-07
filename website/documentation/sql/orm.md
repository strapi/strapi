# SQL ORM

The SQL ORM aims to provide a simple library for common tasks when querying databases in JavaScript, and forming relations between these objects, taking a lot of ideas from the the [Data Mapper Pattern](http://en.wikipedia.org/wiki/Data_mapper_pattern).

The Strapi SQL ORM doesn't force you to use any specific validation scheme, provides flexible and efficient relation/nested-relation loading, and first class transaction support.

It's a lean Object Relational Mapper, allowing you to drop down to the [raw interface](./raw/index.html) whenever you need a custom query that doesn't quite fit with the stock conventions.

## Promises

The Strapi SQL ORM uses its own copy of the "bluebird" promise library. That means methods are chainables and return promises.

```js
User.forge()
  .where('reviews', '>', 100)
  .limit(10)
  .offset(30)
  .fetch()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

## Query language basics

### Fetch a record

Example:

```js
User.forge({id: 123})
  .fetch()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

The `console.log()` will print out:

```js
{
  "id": 123,
  "firstname": "John",
  "lastname": "Doe",
  "age": 20
}
```

It is also possible to eager loading any specified relations named on the model:

```js
User.forge({id: 123})
  .fetch({
    withRelated: ['friends', 'likes']
  })
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

The `console.log()` will print out:

```js
{
  "id": 123,
  "firstname": "John",
  "lastname": "Doe",
  "age": 20,
  "friends": [{
    "id": 99,
    "firstname": "Peter",
    "lastname": "Arrow",
    "age": 53
  }, {
    "id": 48,
    "firstname": "Andrea",
    "lastname": "Nelson",
    "age": 32
  }],
  "likes": [{
    "post_id": 1829,
    "date": "2016-04-22T06:00:00Z"
  }, {
    "post_id": 7849,
    "date": "2016-03-22T07:32:45Z"
  }]
}
```

### Fetch records

Example:

```js
User.forge()
  .fetchAll()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

The `console.log()` will print out:

```js
[{
  "id": 123,
  "firstname": "John",
  "lastname": "Doe",
  "age": 20
}, {
   "id": 99,
  "firstname": "Peter",
  "lastname": "Arrow",
  "age": 53
}, {
  ...
}]
```

It is also possible to eager loading any specified relations named on the model:

```js
User.forge()
  .fetchAll({
    withRelated: ['friends', 'likes']
  })
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

### Create a record

Example:

```js
User.forge({
    'firstname': 'John',
    'lastname': 'Doe',
    'age': 20
  })
  .save()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

The `console.log()` will print out:

```js
{
  "id": 123,
  "firstname": "John",
  "lastname": "Doe",
  "age": 20
}
```

### Create a record with one-to-one/one-to-many relationship

The only difference between the two relationship cases will be on the database constraints layer:
- *one-to-one*: it will allow only one user with the sponsor ID `849`
- *one-to-many*: it will allow more than one user with the sponsor ID `849`

Example:

```js
User.forge({
    'firstname': 'John',
    'lastname': 'Doe',
    'age': 20,
    'sponsor': 849
  })
  .save()
  .then(function (model) {
    return model.fetch({
      withRelated: 'sponsor'
    });
  })
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

The `console.log()` will print out:

```js
{
  "id": 123,
  "firstname": "John",
  "lastname": "Doe",
  "age": 20,
  "sponsor": {
    "id": 849,
    "firstname": "Peter",
    "lastname": "Arrow",
    "age": 53
  }
}
```

### Create a record with many-to-many relationship

```js
const friend1 = User.forge({id: 1});
const friend2 = User.forge({id: 2});

User.forge({
    'firstname': 'John',
    'lastname': 'Doe',
    'age': 20
  })
  .save()
  .tap(function (model) {
    return model.friends().attach([friend1, friend2]);
  })
  .then(function (model) {
    return model.fetch({
      withRelated: 'friends'
    });
  })
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

The `console.log()` will print out:

```js
{
  "id": 123,
  "firstname": "John",
  "lastname": "Doe",
  "age": 20,
  "friends": [{
    "id": 1,
    "firstname": "Peter",
    "lastname": "Arrow",
    "age": 53
  }, {
    "id": 2,
    "firstname": "Andrea",
    "lastname": "Nelson",
    "age": 32
  }]
}
```

### Update a record

```js
User.forge({
    id: 123
  })
  .save({
    'lastname': 'Does',
    'age': 40
  }, {path: true})
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function(err) {
    reject(err);
  });
```

The `console.log()` will print out:

```js
{
  "id": 123,
  "firstname": "John",
  "lastname": "Does",
  "age": 40,
}
```

### Update a record with a one-to-one/one-to-many relationship

This is exactly the same as update a record without relationship.

```js
User.forge({
    id: 123
  })
  .save({
    'sponsor': 756
  }, {path: true})
  .then(function (model) {
    return model.fetch({
      withRelated: 'sponsor'
    });
  })
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function(err) {
    reject(err);
  });
```

The `console.log()` will print out:

```js
{
  "id": 123,
  "firstname": "John",
  "lastname": "Does",
  "age": 40,
  "sponsor": {
    "id": 756,
    "firstname": "Martin",
    "lastname": "Terry",
    "age": 37
  }
}
```

### Update a record with a many-to-many relationship

This is also exactly the same as update a record without relationship. However, there are two cases:
- Add new relationship(s) to a record
- Remove current(s) relationship(s) to the record

#### Add new relationship(s) to a record

```js
const friend3 = User.forge({id: 3});

User.forge({
    id: 123
  })
  .friends()
  .attach([friend3])
  .then(function (model) {
    return model.fetch({
      withRelated: 'friends'
    });
  })
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

The `console.log()` will print out:

```js
{
  "id": 123,
  "firstname": "John",
  "lastname": "Doe",
  "age": 20,
  "friends": [{
    "id": 1,
    "firstname": "Peter",
    "lastname": "Arrow",
    "age": 53
  }, {
    "id": 2,
    "firstname": "Andrea",
    "lastname": "Nelson",
    "age": 32
  }, {
    "id": 3,
    "firstname": "Paul",
    "lastname": "Thomas",
    "age": 78
  }]
}
```

#### Remove current(s) relationship(s) to a record

```js
const friend2 = User.forge({id: 2});
const friend3 = User.forge({id: 3});

User.forge({
    id: 123
  })
  .friends()
  .detach([friend2, friend3])
  .then(function (model) {
    return model.fetch({
      withRelated: 'friends'
    });
  })
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

The `console.log()` will print out:

```js
{
  "id": 123,
  "firstname": "John",
  "lastname": "Doe",
  "age": 20,
  "friends": [{
    "id": 1,
    "firstname": "Peter",
    "lastname": "Arrow",
    "age": 53
  }]
}
```

### Delete a record

```js
User.forge({
    id: 123
  })
  .destroy()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function(err) {
    console.log(err);
  });
```

The `console.log()` will print out:

```js
null
```

## Query options

### raw

```js
User.forge({
    id: 123
  })
  .query(function (qb) {
    qb.offset(0).limit(10);
  }))
  .fetch()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  })
```

### count

Count the entries for a query:

```js
User.forge()
  .where({
    'age': 20
  })
  .count()
  .then(function (count) {
    console.log(count);
  })
  .catch(function (err) {
    console.log(err);
  })
```

### where

Adds a `where` clause to the query:

```js
User.forge()
  .where({
    'firstname': 'John',
    'age': 20
  })
  .fetch()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

### orderBy

Adds an `orderBy` clause to the query.

Using the object syntax:

```js
User.forge()
  .query({
    'orderBy': 'firstname'
  })
  .fetch()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

This syntax doesn't allow to update `ASC` / `DESC` parameter. To do so, you have to use the function syntax below:

```js
User.forge()
  .query(function (qb) {
    qb.orderBy('firstname', 'desc');
  }))
  .fetch()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

### groupBy

Adds an `groupBy` clause to the query:

```js
User.forge()
  .query({
    'groupBy': 'age'
  })
  .fetch()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

### limit

Adds an `limit` clause to the query:

```js
User.forge()
  .query({
    'limit': 20
  })
  .fetch()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

### offset

Adds an `offset` clause to the query:

```js
User.forge()
  .query({
    'offset': 10
  })
  .fetch()
  .then(function (model) {
    console.log(model.toJSON());
  })
  .catch(function (err) {
    console.log(err);
  });
```

## Lifecycle events

Lifecycle callbacks are functions you can define to run at certain times in a query. They are hooks that you can tap into in order to change data. Strapi exposes a handful of lifecycle callbacks by default.

Lifecycle events must be placed in your JavaScript file of your models.

### Common callbacks

#### beforeSave

Fired before an `insert` or `update` query. A promise may be returned from the event handler for async behavior. Throwing an exception from the handler will cancel the save.

Code:

```js
beforeSave: (model, attrs, options) => {
  return new Promise();
},
```

Parameters:

- `model`: The model firing the event.
- `attrs`: Attributes that will be inserted or updated.
- `options`: Options object passed to `save`.

Returns: Promise.

#### afterSave

Fired after an `insert` or `update` query.

Code:

```js
afterSave: (model, response, options) => {
  return new Promise();
},
```

Parameters:

- `model`: The model firing the event.
- `response`: The database response.
- `options`: Options object passed to `save`.

Returns: Promise.

### Callbacks on fetch

#### beforeFetch

Fired before a `fetch` operation. A promise may be returned from the event handler for async behavior.

Code:

```js
beforeFetch: (model, columns, options) => {
  return new Promise();
},
```

Parameters:

- `model`: The model firing the event.
- `columns`: The columns to be retrieved by the query.
- `options`: Options object passed to `fetch`.

Returns: Promise.

#### afterFetch

Fired after a `fetch` operation. A promise may be returned from the event handler for async behavior.

Code:

```js
afterFetch: (model, response, options) => {
  return new Promise();
},
```

Parameters:

- `model`: The model firing the event.
- `response`: SQL query response.
- `options`: Options object passed to `fetch`.

Returns: Promise. *If the handler returns a promise, `fetch` will wait for it to be resolved.*

### Callbacks on create

#### beforeCreate

Fired before `insert` query. A promise may be returned from the event handler for async behavior. Throwing an exception from the handler will cancel the save operation.

Code:

```js
beforeCreate: (model, attrs, options) => {
  return new Promise();
},
```

Parameters:

- `model`: The model firing the event.
- `attrs`: Attributes that will be inserted.
- `options`: Options object passed to `save`.

Returns: Promise.

#### afterCreate

Fired after an `insert` query.

Code:

```js
afterCreate: (model, attrs, options) => {
  return new Promise();
},
```

Parameters:

- `model`: The model firing the event.
- `attrs`: Attributes inserted.
- `options`: Options object passed to `save`.

Returns: Promise.

### Callbacks on update

#### beforeUpdate

Fired before an `update` query. A promise may be returned from the event handler for async behavior. Throwing an exception from the handler will cancel the save operation.

Code:

```js
beforeUpdate: (model, attrs, options) => {
  return new Promise();
},
```

Parameters:

- `model`: The model firing the event.
- `attrs`: Attributes that will be updated.
- `options`: Options object passed to `save`.

Returns: Promise.

#### afterUpdate

Fired after an `update` query.

Code:

```js
afterUpdate: (model, attrs, options) => {
  return new Promise();
},
```

Parameters:

- `model`: The model firing the event.
- `attrs`: Attributes updated.
- `options`: Options object passed to `save`.

Returns: Promise.

### Callbacks on destroy

#### beforeDestroy

Fired before a `delete` query. A promise may be returned from the event handler for async behavior. Throwing an exception from the handler will reject the promise and cancel the deletion.

Code:

```js
beforeDestroy: (model, attrs, options) => {
  return new Promise();
},
```

Parameters:

- `model`: The model firing the event.
- `attrs`: Attributes that will be destroyed.
- `options`: Options object passed to `save`.

Returns: Promise.

#### afterDestroy

Fired before a `delete` query. A promise may be returned from the event handler for async behavior.

Code:

```js
afterDestroy: (model, attrs, options) => {
  return new Promise();
},
```

Parameters:

- `model`: The model firing the event.
- `attrs`: Attributes destroyed.
- `options`: Options object passed to `save`.

Returns: Promise.
