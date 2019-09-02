# Blueprints

The blueprints are a set of useful actions containing all the logic you need to
create a clean RESTful API. The generated controllers and routes are automatically
plugged to the blueprint actions. Thanks to that, as soon as you generate a new API
from the CLI, you can enjoy a RESTful API without writing any line of code.

For example, if you generate a `pet` API, you will be able to immediately visit
`POST /pet?name=joe` to create a pet, and visit `GET /pet` to see an array
of your application's pets.

Blueprints are great for prototyping, but they are also a powerful tool in production
due to their ability to be overridden, protected, extended or disabled entirely.

All of the following actions return a promise.

## find records

Returns a list of records from the model as a JSON array of objects.

Route:

```js
{
  "routes": {
    "GET /pet": {
      "controller": "Pet",
      "action": "find"
    }
  }
}
```

Controller function:

```js
find: function * () {
  this.model = 'Pet';

  try {
    this.body = yield strapi.hooks.blueprints.find(this);
  } catch (error) {
    this.body = error;
  }
}
```

Results may be filtered, paginated, and sorted based on the blueprint configuration
and/or parameters sent in the request.

Optional parameters:
- `*` (string): To filter results based on a particular attribute, specify a query
  parameter with the same name as the attribute defined on your model.
- `where` (string): Instead of filtering based on a specific attribute, you may instead
  choose to provide a `where` parameter with a Waterline `WHERE` criteria object,
  encoded as a JSON string. This allows you to take advantage of `contains`, `startsWith`,
  and other sub-attribute criteria modifiers for more powerful `find()` queries.
- `limit` (number): The maximum number of records to send back (useful for pagination).
  Defaults to 30.
- `skip` (number): The number of records to skip (useful for pagination).
- `sort` (string): The sort order. By default, returned records are sorted by primary key value
  in ascending order.  `ASC` or `DESC`.
- `populate` (string): If specified, override the default automatic population process.
  Accepts a comma separated list of attributes names for which to populate record values.

## findOne record

Returns a single record from the model as a JSON object.

Route:

```js
{
  "routes": {
    "GET /pet/:id": {
      "controller": "Pet",
      "action": "findOne"
    }
  }
}
```

Controller function:

```js
findOne: function * () {
  this.model = 'Pet';

  try {
    this.body = yield strapi.hooks.blueprints.findOne(this);
  } catch (error) {
    this.body = error;
  }
}
```

The `findOne()` blueprint action returns a single record from the model as a JSON object.
The specified id is the primary key of the desired record.

Required parameters:
- `id` (string or number): The desired record's primary key value.

## create a record

Creates a new model instance in your database then returns its values.

Route:

```js
{
  "routes": {
    "POST /pet/:id": {
      "controller": "Pet",
      "action": "create"
    }
  }
}
```

Controller function:

```js
create: function * () {
  this.model = 'Pet';

  try {
    this.body = yield strapi.hooks.blueprints.create(this);
  } catch (error) {
    this.body = error;
  }
}
```

Attributes can be sent in the HTTP body as form-encoded values or JSON.

The promise returned contains a JSON object representing the newly created instance.
If a validation error occurred, a JSON response with the invalid attributes and
the Context status is set to `400`.

Optional parameters:
- `*` (string, number, object or array): Pass in body parameter with the same
  name as the attribute defined in your model to set those values on your new record.
  Nested objects and arrays passed in as parameters are handled the same
  way as if they were passed into the model's `.create()` method.

## update a record

Updates an existing record. Attributes to change should be sent in the HTTP body
as form-encoded values or JSON.

Route:

```js
{
  "routes": {
    "PUT /pet/:id": {
      "controller": "Pet",
      "action": "update"
    }
  }
}
```

Controller function:

```js
update: function * () {
  this.model = 'Pet';

  try {
    this.body = yield strapi.hooks.blueprints.update(this);
  } catch (error) {
    this.body = error;
  }
}
```

Updates the model instance which matches the `id` parameter.
The promise resolved contains a JSON object representing the newly updated instance.
If a validation error occurred, a JSON response with the invalid attributes and a
`400` status code will be returned instead. If no model instance exists matching the
specified `id`, a `404` is returned.

Required parameters:
- `id` (string or number): The desired record's primary key value.

Optional parameters:
- `*` (string, number, object or array): Pass in body parameter with the same
  name as the attribute defined on your model to set those values on your new record.
  Nested objects and arrays passed in as parameters are handled the same
  way as if they were passed into the model's `.update()` method.

## destroy a record

Deletes an existing record specified by `id` from the database forever and returns
the values of the deleted record.

Route:

```js
{
  "routes": {
    "DELETE /pet/:id": {
      "controller": "Pet",
      "action": "destroy"
    }
  }
}
```

Controller function:

```js
destroy: function * () {
  this.model = 'Pet';

  try {
    this.body = yield strapi.hooks.blueprints.destroy(this);
  } catch (error) {
    this.body = error;
  }
}
```

Destroys the model instance which matches the `id` parameter.
Responds with a JSON object representing the newly destroyed instance.
If no model instance exists matching the specified `id`, the Context status is set to 400 and the returned promise is rejected.

Required parameters:
- `id` (string or number): The desired record's primary key value.

## add to a record

Adds an association between two records.

Route:

```js
{
  "routes": {
    "POST /pet/:id/:parentId/:relation": {
      "controller": "Pet",
      "action": "add"
    }
  }
}
```

Controller function:

```js
add: function * () {
  this.model = 'Pet';

  try {
    this.body = yield strapi.hooks.blueprints.add(this);
  } catch (error) {
    this.body = error;
  }
}
```

This action pushes a reference to some other record (the "foreign" record) onto a
collection attribute of this record (the "primary" record).

- If `:relation` of an existing record is supplied, it will be associated with
  the primary record.
- If no `:relation` is supplied, and the body of the `POST` contains values for a
  new record, that record will be created and associated with the primary record.
- If the collection within the primary record already contains a reference to the
  foreign record, this action will be ignored.
- If the association is two-way (i.e. reflexive, with `via` on both sides) the association
  on the foreign record will also be updated.

Notes:
- This action is for dealing with plural ("collection") associations.
  If you want to set or unset a singular ("model") association, just use
  the `update` blueprint.

## remove from a record

Removes an association between two records.

Route:

```js
{
  "routes": {
    "DELETE /pet/:id/:parentId/:relation/:id": {
      "controller": "Pet",
      "action": "remove"
    }
  }
}
```

Controller function:

```js
remove: function * () {
  this.model = 'Pet';

  try {
    this.body = yield strapi.hooks.blueprints.remove(this);
  } catch (error) {
    this.body = error;
  }
}
```

This action removes a reference to some other record (the "foreign" record)
from a collection attribute of this record (the "primary" record).

- If the foreign record does not exist, it is created first.
- If the collection doesn't contain a reference to the foreign record,
  this action will be ignored.
- If the association is two-way (i.e. reflexive, with `via` on both sides)
  the association on the foreign record will also be updated.
