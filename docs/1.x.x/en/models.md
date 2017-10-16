# Models

Strapi comes installed with a powerful Object-Relational-Mapper (ORM) called Waterline,
a datastore-agnostic tool that dramatically simplifies interaction with one or more databases.

Models represent a structure of data which requires persistent storage. The data may live in any data-store
but is interfaced in the same way. This allows your users to live in PostgreSQL and your user preferences
to live in MongoDB and you will interact with the data models in the exact same way.

If you're using MySQL, a model might correspond to a table. If you're using MongoDB, it might correspond
to a collection. In either case, the goal is to provide a simple, modular way of managing data without
relying on any one type of database.

Models are defined in the `./api/<apiName>/models` directory.

## Model settings

The following properties can be specified at the top level of your model definition to override
the defaults for that particular model.

For example, this a basic model `Pet`:
```js
{
  "identity": "pet",
  "connection": "mongoDBServer",
  "schema": true,
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "gender": {
      "type": "string",
      "enum": ["male", "female"]
    },
    "age": {
      "type": "int",
      "max": 100
    },
    "birthDate": {
      "type": "date"
    },
    "breed": {
      "type": "string"
    }
  },
  "autoPK": true,
  "autoCreatedAt": true,
  "autoUpdatedAt": true
}

```

### schema

A flag to toggle schemaless or schema mode in databases that support schemaless data structures.
If turned off, this will allow you to store arbitrary data in a record. If turned on, only attributes
defined in the model's attributes object will be stored.

For adapters that don't require a schema, such as MongoDB or Redis, the `schema` key is set to `false`.

```js
{
  "schema": true|false
}
```

### connection

The configured database connection where this model will fetch and save its data.
Defaults to `defaultSQLite`, the default connection that uses the `waterline-sqlite3` adapter.

```js
{
  "connection": "mongoDBServer"
}
```

### identity

The lowercase unique key for the model. By default, a model's identity is inferred automatically
by lowercasing its filename. You should never change this property on your models.

```js
{
  "identity": "petModel"
}
```

### globalId

This flag changes the global name by which you can access your model (if the globalization of models
is enabled). You should never change this property on your models.

```js
{
  "globaId": "pets"
}
```

For example to access to your model function:
```js
Pets.find().exec(function (error, pets) {
  if (error) {
    console.log(error);
    return false;
  }

  console.log(pets);
});
```

### autoPK

A flag to toggle the automatic definition of a primary key in your model.
The details of this default primary key vary between adapters. In any case, the primary keys generated
by `autoPK` will be unique. If turned off no primary key will be created by default, and you will need
to define one manually using `primaryKey: true` for one of the model attributes.

```js
{
  "autoPK": true|false
}
```

### autoCreatedAt

A flag to toggle the automatic definition of a `createdAt` attribute in your model.
By default, `createdAt` is an attribute which will be automatically set when a record is created with
the current timestamp.

```js
{
  "autoCreatedAt": true|false
}
```

### autoUpdatedAt

A flag to toggle the automatic definition of a `updatedAt` attribute in your model.
By default, `updatedAt` is an attribute which will be automatically set with the current timestamp
every time a record is updated.

```js
{
  "autoUpdatedAt": true|false
}
```

### tableName

You can define a custom name for the physical collection in your adapter by adding a `tableName`
attribute. This isn't just for tables. In MySQL, PostgreSQL, Oracle, etc. this setting refers
to the name of the table, but in MongoDB or Redis, it refers to the collection, and so forth.
If no `tableName` is specified, Waterline will use the model's `identity` as its `tableName`.

This is particularly useful for working with pre-existing/legacy databases.

```js
{
  "tableName": "pets_table"
}
```

### attributes

Model attributes are basic pieces of information about a model.
A model called `Pet` might have attributes called `name`, `gender`, `age`,
`birthday` and `breed`.

Options can be used to enforce various constraints and add special enhancements to model attributes.

#### type

Specifies the type of data that will be stored in this attribute. One of:
- `string`
- `text`
- `integer`
- `float`
- `date`
- `datetime`
- `boolean`
- `binary`
- `array`
- `json`

Defaults to `string` if not specified.

### Validations

Strapi bundles support for automatic validations of your models' attributes.
Any time a record is updated, or a new record is created, the data for each attribute will
be checked against all of your predefined validation rules. This provides a convenient failsafe
to ensure that invalid entries don't make their way into your application's database(s).

Validations are defined directly in your collection attributes.

- `after` (date): Checks if string date in this record is after the specified `Date`.
  Must be valid JavaScript `Date`.
- `alpha` (boolean): Checks if string in this record contains only letters (a-zA-Z).
- `alphadashed` (boolean): Checks if string in this record contains only numbers and/or dashes.
- `alphanumeric` (boolean): Checks if string in this record contains only letters and numbers.
- `alphanumericdashed` (boolean): Checks if string in this record contains only numbers and/or
  letters and/or dashes.
- `array` (boolean): Checks if this record is a valid JavaScript array object.
  Strings formatted as arrays will fail.
- `before` (date): Checks if string in this record is a date that's before the specified date.
- `binary` (boolean): Checks if this record is a valid binary data. Strings will pass.
- `boolean` (boolean): Checks if this record is a valid boolean. Strings will fail.
- `contains` (string): Checks if string in this record contains the seed.
- `creditcard` (boolean): Checks if string in this record is a credit card.
- `date` (boolean): Checks if string in this record is a date takes both strings and JavaScript.
- `datetime` (boolean): Checks if string in this record looks like a JavaScript `datetime`.
- `decimal` (boolean): Checks if it contains a decimal or is less than 1.
- `email` (boolean): Checks if string in this record looks like an email address.
- `empty` (boolean): Checks if the entry is empty. Arrays, strings, or arguments objects with
  a length of 0 and objects with no
  own enumerable properties are considered empty.
- `equals` (integer): Checks if string in this record is equal to the specified value.
  They must match in both value and type.
- `falsey` (boolean): Would a Javascript engine register a value of `false` on this?.
- `finite` (boolean): Checks if given value is, or can be coerced to, a finite number.
  This is not the same as native `isFinite`
  which will return `true` for booleans and empty strings.
- `float` (boolean): Checks if string in this record is of the number type float.
- `hexadecimal` (boolean): Checks if string in this record is a hexadecimal number.
- `hexColor` (boolean): Checks if string in this record is a hexadecimal color.
- `in` (array): Checks if string in this record is in the specified array of allowed
  string values.
- `int` (boolean): Check if string in this record is an integer.
- `integer` (boolean): Check if string in this record is an integer. Alias for `int`.
- `ip` (boolean): Checks if string in this record is a valid IP (v4 or v6).
- `ipv4` (boolean): Checks if string in this record is a valid IP v4.
- `ipv6` (boolean): Checks if string in this record is aa valid IP v6.
- `json` (boolean): Checks if the record is a JSON.
- `lowercase` (boolean): Check if string in this record is in all lowercase.
- `max` (integer): max value for an integer.
- `maxLength` (integer):
- `min` (integer): min value for an integer.
- `minLength` (integer):
- `notContains` (string): Checks if string in this record doesn't contain the seed.
- `notIn` (array): does the value of this model attribute exist inside of the defined
  validator value (of the same type).
  Takes strings and arrays.
- `notNull` (boolean): does this not have a value of `null` ?.
- `null` (boolean): Checks if string in this record is null.
- `number` (boolean): Checks if this record is a number. `NaN` is considered a number.
- `numeric` (boolean): Checks if string in this record contains only numbers.
- `object` (boolean): Checks if this attribute is the language type of Object.
  Passes for arrays, functions, objects,
  regexes, new Number(0), and new String('') !
- `regex` (regex): Checks if the record matches the specific regex.
- `required` (boolean): Must this model attribute contain valid data before a new
  record can be created?.
- `string` (boolean): Checks if the record is a string.
- `text` (boolean): Checks if the record is a text.
- `truthy` (boolean): Would a Javascript engine register a value of `false` on this?
- `undefined` (boolean): Would a JavaScript engine register this thing as have the
  value `undefined`?
- `uppercase` (boolean): Checks if string in this record is uppercase.
- `url` (boolean): Checks if string in this record is a URL.
- `urlish` (boolean): Checks if string in this record contains something that looks like
  a route, ending with a file extension.
- `uuid` (boolean): Checks if string in this record is a UUID (v3, v4, or v5).
- `uuidv3` (boolean): Checks if string in this record is a UUID (v3).
- `uuidv4` (boolean): Checks if string in this record is a UUID (v4).

#### defaultsTo

When a record is created, if no value was supplied, the record will be created with the specified
`defaultsTo` value.

```js
"attributes": {
  "usersGroup": {
    "type": "string",
    "defaultsTo": "guess"
  }
}
```

#### autoIncrement

Sets up the attribute as an auto-increment key. When a new record is added to the model,
if a value for this attribute is not specified, it will be generated by incrementing the most recent
record's value by one.

Attributes which specify `autoIncrement` should always be of `type: integer`.
Also, bear in mind that the level of support varies across different datastores.
For instance, MySQL will not allow more than one auto-incrementing column per table.

```js
"attributes": {
  "placeInLine": {
    "type": "integer",
    "autoIncrement": true
  }
}
```

#### unique

Ensures no two records will be allowed with the same value for the target attribute.
This is an adapter-level constraint, so in most cases this will result in a unique index on the
attribute being created in the underlying datastore.

Defaults to `false` if not specified.

```js
"attributes": {
  "username": {
    "type": "string",
    "unique": true
  }
}
```

#### primaryKey

Use this attribute as the the primary key for the record. Only one attribute per model can be the
`primaryKey`. Defaults to `false` if not specified.

This should never be used unless `autoPK` is set to `false`.

```js
"attributes": {
  "uuid": {
    "type": "string",
    "primaryKey": true,
    "required": true
  }
}
```

#### enum

A special validation property which only saves data which matches a whitelisted set of values.

```js
"attributes": {
  "gender": {
    "type": "string",
    "enum": ["male", "female"]
  }
}
```

#### size

If supported in the adapter, can be used to define the size of the attribute.
For example in MySQL, `size` can be specified as a number (`n`) to create a column with the SQL
data type: `varchar(n)`.

```js
"attributes": {
  "name": {
    "type": "string",
    "size": 24
  }
}
```

#### columnName

Inside an attribute definition, you can specify a `columnName` to force Waterline to store data
for that attribute in a specific column in the configured connection.
Be aware that this is not necessarily SQL-specific. It will also work for MongoDB fields, etc.

While the `columnName` property is primarily designed for working with existing/legacy databases,
it can also be useful in situations where your database is being shared by other applications,
or you don't have access permissions to change the schema.

```js
"attributes": {
  "name": {
    "type": "string",
    "columnName": "pet_name"
  }
}
```

## Associations

With Waterline you can associate models with other models across all data stores.
This means that your users can live in PostgreSQL and their photos can live in MongoDB
and you can interact with the data as if they lived together on the same database.
You can also have associations that live on separate connections or in different databases
within the same adapter.

### One-Way associations

A one-way association is where a model is associated with another model.
You could query that model and populate to get the associated model.
You can't however query the associated model and populate to get the associating model.

In this example, we are associating a `User` with a `Pet` but not a `Pet` with a `User`.
Because we have only formed an association on one of the models, a `Pet` has no restrictions
on the number of `User` models it can belong to. If we wanted to, we could change this and
associate the `Pet` with exactly one `User` and the `User` with exactly one `Pet`.

`./api/pet/models/Pet.settings.json`:

```js
{
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "color": {
      "type": "string",
      "required": true
    }
  }
}
```

`./api/user/models/User.settings.json`:

```js
{
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "color": {
      "type": "string",
      "required": true
    },
    "pony": {
      "model": "pet"
    }
  }
}
```

### One-to-One associations

A one-to-one association states that a model may only be associated with one other model.
In order for the model to know which other model it is associated with a foreign key must
be included in the record.

In this example, we are associating a `Pet` with a `User`. The `User` may only have one
`Pet` and viceversa, a `Pet` can only have one `User`. However, in order to query this association
from both sides, you will have to create/update both models.

`./api/pet/models/Pet.settings.json`:

```js
{
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "color": {
      "type": "string",
      "required": true
    },
    "owner": {
      "model": "user"
    }
  }
}
```

`./api/user/models/User.settings.json`:

```js
{
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "age": {
      "type": "integer",
      "required": true
    },
    "pony": {
      "model": "pet"
    }
  }
}
```

### One-to-Many associations

A one-to-many association states that a model can be associated with many other models.
To build this association a virtual attribute is added to a model using the `collection` property.
In a one-to-many association one side must have a `collection` attribute and the other side must contain a
`model` attribute. This allows the many side to know which records it needs to get when a `populate` is used.

Because you may want a model to have multiple one-to-many associations on another model a `via` key is
needed on the `collection` attribute. This states which `model` attribute on the one side of the association
is used to populate the records.

In this example, a `User` can have several `Pet`, but a `Pet` has only one `owner` (from the `User` model).

`./api/pet/models/Pet.settings.json`:

```js
{
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "color": {
      "type": "string",
      "required": true
    },
    "owner": {
      "model": "user"
    }
  }
}
```

`./api/user/models/User.settings.json`:

```js
{
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "age": {
      "type": "integer",
      "required": true
    },
    "pets": {
      "collection": "pet",
      "via": "owner"
    }
  }
}
```

### Many-to-Many associations

A many-to-many association states that a model can be associated with many other models
and vice-versa. Because both models can have many related models a new join table will
need to be created to keep track of these relations.

Waterline will look at your models and if it finds that two models both have `collection`
attributes that point to each other, it will automatically build up a join table for you.

Because you may want a model to have multiple many-to-many associations on another model
a `via` key is needed on the `collection` attribute. This states which `model` attribute on the
one side of the association is used to populate the records.

Using the `User` and `Pet` example lets look at how to build a schema where a `User` may
have many `Pet` records and a `Pet` may have multiple owners.

In this example, we will start with an array of users and an array of pets.
We will create records for each element in each array then associate all of the `Pets` with all
of the `Users`. If everything worked properly, we should be able to query any `User` and see that
they _own_ all of the `Pets`. Furthermore, we should be able to query any `Pet` and see that
it is _owned_ by every `User`.

`./api/pet/models/Pet.settings.json`:

```js
{
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "color": {
      "type": "string",
      "required": true
    },
    "owners": {
      "collection": "user",
      "via": "pets"
    }
  }
}
```

`./api/user/models/User.settings.json`:

```js
{
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "age": {
      "type": "integer",
      "required": true
    },
    "pets": {
      "collection": "pet",
      "via": "owners"
    }
  }
}
```

## Lifecycle Callbacks

Lifecycle callbacks are functions you can define to run at certain times in a query.
They are hooks that you can tap into in order to change data.

Strapi exposes a handful of lifecycle callbacks by default.

### Callbacks on create

- `beforeValidate`: `fn(values, cb)`
- `afterValidate`: `fn(values, cb)`
- `beforeCreate`: `fn(values, cb)`
- `afterCreate`: `fn(newlyInsertedRecord, cb)`

### Callbacks on update

- `beforeValidate: fn(valuesToUpdate, cb)`
- `afterValidate: fn(valuesToUpdate, cb)`
- `beforeUpdate: fn(valuesToUpdate, cb)`
- `afterUpdate: fn(updatedRecord, cb)`

### Callbacks on destroy

- `beforeDestroy`: `fn(criteria, cb)`
- `afterDestroy`: `fn(deletedRecord, cb)`


For example, this could be your `./api/pet/models/Pet.js` file:
```js
module.exports = {
  /**
   * Basic settings
   */

  // The identity to use.
  identity: settings.identity,

  // The connection to use.
  connection: settings.connection,

  // Do you want to respect schema?
  schema: settings.schema,

  // Merge simple attributes from settings with those ones.
  attributes: _.merge(settings.attributes, {

  }),

  // Do you automatically want to have time data?
  autoCreatedAt: settings.autoCreatedAt,
  autoUpdatedAt: settings.autoUpdatedAt,

  /**
   * Lifecycle callbacks on create
   */

  // Before creating a value.
  beforeCreate: function (values, next) {
    // Do some stuff
    next();
  },

  // After creating a value.
  afterCreate: function (newlyInsertedRecord, next) {
    // Do some stuff
    next();
  },

  /**
   * Lifecycle callbacks on update
   */

  // Before updating a value.
  beforeUpdate: function (valuesToUpdate, next) {
    // Do some stuff
    next();
  },

  // After updating a value.
  afterUpdate: function (updatedRecord, next) {
    // Do some stuff
    next();
  },

  /**
   * Lifecycle callbacks on destroy
   */

  // Before destroying a value.
  beforeDestroy: function (criteria, next) {
    // Do some stuff
    next();
  },

  // After destroying a value.
  afterDestroy: function (destroyedRecords, next) {
    // Do some stuff
    next();
  }
```
