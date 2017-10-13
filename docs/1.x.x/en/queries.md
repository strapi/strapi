# Query Interface

The Waterline Query Interface allows you to interact with your models the same
way no matter which adapter they are using. This means you can use the same Query
Language whether your data lives in MySQL, MongoDB, PostgreSQL, etc.

## Query Methods

Every model in Waterline will have a set of query methods exposed on it to allow
you to interact with the database in a normalized fashion.
These are known as the CRUD (`Create`, `Read`, `Update` and `Delete`) methods and
is the primary way of interacting with your data.

There are also a special set of queries known as _dynamic queries_.
These are special class methods that are dynamically generated when you initialize Waterline.
We call them dynamic finders. They perform many of the same functions as the other class
methods but you can call them directly on an attribute in your model.

For most class methods, the callback parameter is optional and if one is not supplied,
it will return a chainable object.

### .find(criteria, [callback])

`find` will return an array of records that match the supplied criteria.
Criteria can be built using the Query Language.

- The `criteria` is required and accepts `{}`, `[{}]`, `string` and `int` data types.
- The `callback` function is optional.

Any string arguments passed must be the ID of the record.
This method will always return records in an array.
If you are trying to find an attribute that is an array, you must wrap it in an additional
set of brackets otherwise Waterline will think you want to perform an `inQuery`.

```js
User.find({
    name: 'Walter Jr'
  })
  .exec(function (err, users) {
    if (err) {
      console.log(err);
    }
    console.log(users);
  });
```

### .findOne(criteria, [callback])

`findOne` will return an object with the first matching result in the data store.

- The `criteria` is required and accepts `{}`, `[{}]`, `string` and `int` data types.
- The `callback` function is optional.

Any string arguments passed must be the ID of the record.
If you are trying to find an attribute that is an array, you must wrap it in an additional
set of brackets otherwise Waterline will think you want to perform an `inQuery`.

```js
User.findOne({
    name: 'Walter Jr'
  })
  .exec(function (err, user) {
    if (err) {
      console.log(err);
    }
    console.log(user);
  });
```

### .create(criteria, [callback])

`create` will attempt to create a new record in the datastore.
If the data is valid and passes all validations it will be sent to the adapters `create` method.

- The `criteria` is required and accepts `{}` and `[{}]` data types.
- The `callback` function is optional.

```js
User.create({
    name: 'Walter Jr'
  })
  .exec(function (err, user) {
    if (err) {
      console.log(err);
    }
    console.log(user);
  });
```

### .findOrCreate(criteria, [values, callback])

`findOrCreate` will return a single record if one was found or created,
or an array of records if multiple get found/created via the supplied criteria or values.
Criteria can be built using the Query Language.

- The `criteria` is required and accepts `{}`, `[{}]`, `string` and `int` data types.
- The `values` is optional and accepts `{}` and `[{}]` data types.
- The `callback` function is optional.

Any string arguments passed must be the ID of the record.
This method can return a single record or an array of records.
If a model is not found and creation values are omitted, it will get created with the supplied criteria values.

Unless an adapter implements its own version of `findOrCreate`, `findOrCreate` will do the
`find` and `create` calls in two separate steps (not transactional).
In a high frequency scenario it's possible for duplicates to be created if the query field(s) are not indexed.

Either user(s) with the name "Walter Jr" get returned or
a single user gets created with the name "Walter Jr" and returned:

```js
User.findOrCreate({
    name: 'Walter Jr'
  })
  .exec(function (err, users) {
    if (err) {
      console.log(err);
    }
    console.log(users);
  });
```

### .update(search criteria, values, [callback])

`update` will attempt to update any records matching the criteria passed in.
Criteria can be built using the Query Language.

- The `criteria` is required and accepts `{}`, `[{}]`, `string` and `int` data types.
- The `values` is required and accepts `{}` and `[{}]` data types.
- The `callback` function is optional.

Although you may pass `.update()` an object or an array of objects,
it will always return an array of objects. Any string arguments passed must be the ID
of the record. If you specify a primary key instead of a criteria object,
any `.where()` filters will be ignored.

```js
User.update({
    name: 'Walter Jr'
  }, {
    name: 'Flynn'
  })
  .exec(function (err, user) {
    if (err) {
      console.log(err);
    }
    console.log(user);
  });
```

### .destroy(criteria, [callback])

`destroy` will destroy any records matching the provided criteria.
Criteria can be built using the Query Language.

- The `criteria` is required and accepts `{}`, `[{}]`, `string` and `int` data types.
- The `callback` function is optional.

If you want to confirm the record exists before you delete it,
you must first perform a `.find()`. Any string arguments passed must be the ID of the record.

```js
User.destroy({
    name: 'Flynn'
  })
  .exec(function (err) {
    if (err) {
      console.log(err);
    }
  });
```

### .query(query, [data], callback)

Some adapters, such as `sails-mysql` and `sails-postgresql`, support the query function
which will run the provided RAW query against the database.
This can sometimes be useful if you want to run complex queries and performance is very important.

- The `query` is required and accepts `string` data types.
- The `data` is optional and accepts `array` data types.
- The `callback` function is required.

The type of the results returned depend on your adapter: `sails-mysql` returns an array of objects
and `sails-postgresql` returns an object containing metadata and the actual results within a 'rows' array.
This function does currently not support promises.

Using PostgreSQL:

```js
const title = "The King's Speech";
Movie.query('SELECT * FROM movie WHERE title = $1', [title], function (err, results) {
  console.log('Found the following movie: ', results.rows[0]);
});
```

Using MySQL:

```js
const title = "The King's Speech";
Movie.query('SELECT * FROM movie WHERE title = $1', [title], function (err, results) {
  console.log('Found the following movie: ', results[0]);
});
```

## Query Language

The Waterline Query Language is an object based criteria used to retrieve the
records from any of the supported database adapters.
This allows you to change your database without changing your codebase.

All queries inside of Waterline are case insensitive. This allows for easier querying
but makes indexing strings tough. This is something to be aware of if you are
indexing and searching on string fields.

### Query Language Basics

The criteria objects are formed using one of four types of object keys.
These are the top level keys used in a query object. It is loosely based on the
criteria used in MongoDB with a few slight variations.

Queries can be built using either a `where` key to specify attributes,
which will allow you to also use query options such as `limit` and `skip` or
if `where` is excluded the entire object will be treated as a `where` criteria.

```js
User.find({
  where: {
    name: 'John'
  },
  skip: 20,
  limit: 10,
  sort: 'name DESC'
});
```

Or:

```js
User.find({
  name: 'John'
});
```

#### Key Pairs

A key pair can be used to search records for values matching exactly what is specified.
This is the base of a criteria object where the key represents an attribute on a model
and the value is a strict equality check of the records for matching values.

```js
User.find({
  name: 'John'
});
```

They can be used together to search multiple attributes:

```js
User.find({
  name: 'John',
  country: 'France'
});
```

#### Modified Pairs

Modified pairs also have model attributes for keys but they also use any of the
supported criteria modifiers to perform queries where a strict equality check wouldn't work.

```js
User.find({
  name: {
    contains: 'alt'
  }
})
```

#### In Pairs

In queries work similarly to MySQL `in` queries. Each element in the array is treated as `or`.

```js
User.find({
  name: ['John', 'Walter']
});
```

#### Not-In Pairs

Not-In queries work similar to `in` queries, except for the nested object criteria.

```js
User.find({
  name: {
    '!': ['John', 'Walter']
  }
});
```

#### Or Pairs

Performing `OR` queries is done by using an array of query pairs.
Results will be returned that match any of the criteria objects inside the array.

```js
User.find({
  or: [
    {
      name: 'John'
    },
    {
      occupation: 'Developer'
    }
  ]
});
```

### Criteria Modifiers

The following modifiers are available to use when building queries:
- `<` or `lessThan`
- `<=` or `lessThanOrEqual`
- `>` or `greaterThan`
- `>=` or `greaterThanOrEqual`
- `!` or `not`
- `like`
- `contains`
- `startsWith`
- `endsWith`

#### < or lessThan

Searches for records where the value is less than the value specified.

```js
User.find({
  age: {
    '<': 30
  }
});
```

#### <= or lessThanOrEqual

Searches for records where the value is less or equal to the value specified.

```js
User.find({
  age: {
    '<=': 21
  }
});
```

#### > or greaterThan

Searches for records where the value is more than the value specified.

```js
User.find({
  age: {
    '>': 18
  }
});
```

#### >= or greaterThanOrEqual

Searches for records where the value is more or equal to the value specified.

```js
User.find({
  age: {
    '>=': 21
  }
});
```

#### ! or not

Searches for records where the value is not equal to the value specified.

```js
User.find({
  name: {
    '!': 'John'
  }
});
```

#### like

Searches for records using pattern matching with the `%` sign.

```js
User.find({
  food: {
    'like': '%burgers'
  }
});
```

#### contains

A shorthand for pattern matching both sides of a string.
Will return records where the value contains the string anywhere inside of it.

```js
User.find({
  class: {
    'like': '%history%'
  }
});
```

```js
User.find({
  class: {
    'contains': 'history'
  }
});
```

#### startsWith

A shorthand for pattern matching the right side of a string
Will return records where the value starts with the supplied string value.

```js
User.find({
  class: {
    'startsWith': 'french'
  }
});
```

```js
User.find({
  class: {
    'like': 'french%'
  }
});
```

#### endsWith

A shorthand for pattern matching the left side of a string.
Will return records where the value ends with the supplied string value.

```js
User.find({
  class: {
    'endsWith': 'can'
  }
});
```

```js
User.find({
  class: {
    'like': '%can'
  }
});
```

#### Date Ranges

You can do date range queries using the comparison operators.

```js
User.find({
  date: {
    '>': new Date('2/4/2014'),
    '<': new Date('2/7/2014')
  }
});
```

### Query Options

Query options allow you refine the results that are returned from a query.

#### Limit results

Limit the number of results returned from a query.

```js
User.find({
  where: {
    name: 'John'
  },
  limit: 20
});
```

#### Skip results

Return all the results excluding the number of items to skip.

```js
User.find({
  where: {
    name: 'John'
  },
  skip: 10
});
```

#### Pagination

`skip` and `limit` can be used together to build up a pagination system.

```js
User.find({
  where: {
    name: 'John'
  },
  limit: 10,
  skip: 10
});
```

#### Sort results

Results can be sorted by attribute name. Simply specify an attribute name for
natural (ascending) sort, or specify an `asc` or `desc` flag for ascending or
descending orders respectively.

Sort by name in ascending order:

```js
User.find({
  where: {
    name: 'John'
  },
  sort: 'name'
});
```

Sort by name in descending order:

```js
User.find({
  where: {
    name: 'John'
  },
  sort: 'name DESC'
});
```

Sort by name in ascending order:

```js
User.find({
  where: {
    name: 'John'
  },
  sort: 'name ASC'
});
```

Sort by binary notation

```js
User.find({
  where: {
    name: 'John'
  },
  sort: {
    name: 1
  }
});
```

Sort by multiple attributes:

```js
User.find({
  where: {
    name: 'John'
  },
  sort: {
    name:  1,
    age: 0
  }
});
```

#### Select a field

Apply a projection to a Waterline query.

This example only returns the field name:

```js
User.find({
  where: {
    age: {
      '<': 30
    }
  },
  select: ['name']
});
```
