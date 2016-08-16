# Models

A model represents a collection of structured data, usually corresponding to a single table or collection in a database.

> Migrations allow you to evolve your database schema over time. Rather than write schema modifications in pure SQL, migrations allow you to describe changes to your tables.
You can think of each migration as being a new "version" of the database. A schema starts off with nothing in it, and each migration modifies it to add or remove tables, columns, or entries. Strapi knows how to update your schema along this timeline, bringing it from whatever point it is in the history to the latest version.

!!! note
    Do not worry about how to write migrations-- Strapi does the job for you based on your model definitions. [Learn more about migrations](./migrations/index.html).

## Basic information

### Connection

The `connection` key sets the the connection to use. If no connection specified, Strapi will use the `defaultConnection` registered in your configuration.

In the model:

```js
{
  "connection": "default"
}
```

### Table name

The `tableName` key sets the table name to use in your database.

!!! important
    Never pluralize a table name-- it's a SQL convention.

In the model:

```js
{
  "tableName": "user"
}
```

Create a new table in a migration file:

```js
connection.schema.createTableIfNotExists('user', function (table) {
  // Some schema building here...
})
```

Drop an existing table in a migration file:

```js
connection.schema.dropTableIfExists('user');
```

Rename an existing table in a migration file:

```js
connection.schema.renameTable('user', 'old_user')
```

## Options

### Increments

The `table.increments()` method adds an auto incrementing column, in PostgreSQL this is a serial. This will be used as the primary key for the column. Also available is a "bigIncrement" if you wish to add a "bigint" incrementing number (in PostgreSQL "bigserial").

In the model:

```js
{
  "options": {
    "increments": true
  }
}
```

In a migration file, this generates:

```js
table.increments();
```

### Timestamps

Adds a `created_at` and `updated_at` column on the database, setting these each to `dateTime` types.

In the model:

```js
{
  "options": {
    "timestamps": true
  }
}
```

In a migration file, this generates:

```js
table.timestamps();
```

### Comment

Sets the comment for a table.

In the model:

```js
{
  "options": {
    "comment": "This is my awesome table"
  }
}
```

In a migration file, this generates:

```js
table.comment('This is my awesome table');
```

### Primary

Creates a compound primary key with an array of column names.

In the model:

```js
{
  "options": {
    "primary": ["id", "username", "uid"]
  }
}
```

In a migration file, this generates:

```js
table.primary(['id', 'username', 'uid']);
```

## Attributes

### Types

For every type of column, the code to drop a column is:

```js
table.dropColumn('columnName');
```

The code to rename an existing column is:

```js
connection.schema.renameColumn('uid', 'old_uid')
```

#### String

`string` column, with optional `length` defaulting to `255`.

In the model:

```js
{
  "attributes": {
    "username": {
      "type": "string",
      "length": 160
    }
  }
}
```

In a migration file, this generates:

```js
table.string('username', 160);
```

#### Text

`text` column, with optional `textType` for MySQL text datatype preference.
`textType` may be `mediumtext` or `longtext`, otherwise defaults to `text`.

In the model:

```js
{
  "attributes": {
    "biography": {
      "type": "text",
      "textType": "longtext"
    }
  }
}
```

In a migration file, this generates:

```js
table.text('biography', 'longtext');
```

#### Integer and big integer

`integer` (or `bigInteger` if needed for MySQL and PostgreSQL) column.

In the model:

```js
{
  "attributes": {
    "age": {
      "type": "bigInteger"
    }
  }
}
```

In a migration file, this generates:

```js
table.bigInteger('age');
```

If you want to have an integer even in MySQL and PostgreSQL simply use `integer` instead of `bigInteger`:

```js
table.integer('age');
```

#### Float and decimal

`float` or `decimal` column.

`decimal` and `float` are both used to store numerical values. They pretty are the same but they have the following main differences:

- `float` is approximate-number data type, which means that not all values in the data type range can be represented exactly.
- `decimal` is fixed-Precision data type, which means that all the values in the data type range can be represented exactly with "precision" and "scale".

Converting from `decimal` to `float` can cause some loss of precision.

The `table.decimal()` method creates a new "decimal" column.
The `table.float()` method creates a new "float" column.

They both come with an optional "precision" (defaults to `8`) and "scale" (defaults to `2`).

In the model:

```js
{
  "attributes": {
    "price": {
      "type": "float",
      "precision": 3,
      "scale": 2
    }
  }
}
```

Using the `table.decimal()` method:

```js
connection.schema.table('products', function (table) {
  table.decimal('price', 2, 2);
})
```

Using the `table.float()` method:

```js
connection.schema.table('car', function (table) {
  table.float('speed', 8, 2);
})
```

#### Date, time, date time and timestamp

`date`, `time`, `datetime` or `timestamp` column.

`date`, `time`, `datetime` and `timestamp` can be pretty confusing sometimes.

Here are the formats:
- `date` format: YYYY-MM-DD
- `time` format: HH:MI:SS
- `datetime` format: YYYY-MM-DD HH:MI:SS
- `timestamp` format: YYYY-MM-DD HH:MI:SS

In the model:

```js
{
  "attributes": {
    "birth": {
      "type": "date"
    }
  }
}
```

Using the `table.date()` method:

```js
table.date('birth');
```

Using the `table.datetime()` method:

```js
connection.schema.table('articles', function (table) {
  table.datetime('written_on');
})
```

Using the `table.time()` method:

```js
connection.schema.table('flights', function (table) {
  table.time('arrived_at');
})
```

Using the `table.timestamp()` method with a default value to now:

```js
connection.schema.table('articles', function (table) {
  table.timestamp('written_at').defaultTo(connection.fn.now());
})
```

#### Boolean

`boolean` column.

In the model:

```js
{
  "attributes": {
    "isActive": {
      "type": "boolean",
      "defaultTo": false
    }
  }
}
```

In a migration file, this generates:

```js
table.boolean('isActive').defaultTo(false);
```

#### Binary

`binary` column, with optional `length` argument for MySQL.

In the model:

```js
{
  "attributes": {
    "picture": {
      "type": "binary",
      "length": 200
    }
  }
}
```

In a migration file, this generates:

```js
table.binary('picture', 200);
```

#### UUID

`uuid` column. This uses the built-in `uuid` type in PostgreSQL, and falling back to a "char(36)" in other databases.

In the model:

```js
{
  "attributes": {
    "license": {
      "type": "uuid"
    }
  }
}
```

In a migration file, this generates:

```js
connection.schema.table('cars', function (table) {
  table.uuid('license');
})
```

#### Enumeration

`enum` column. `values` and a `defaultTo` value can be passed.

The `table.enu()` method creates a new "enum" column (aliased to `enu`, as `enum` is a reserved word in JavaScript).

An "enum" is a "string" object with a value chosen from a list of permitted values that are enumerated explicitly in the column specification at table creation time.

In the model:

```js
{
  "attributes": {
    "status": {
      "type": "enum",
      "values": [
        "Open",
        "Closed"
      ],
      "defaultTo": "Open"
    }
  }
}
```

In a migration file, this generates:

```js
connection.schema.table('articles', function (table) {
  table.enu('status', ['Open', 'Closed']).defaultTo('Open');
})
```

#### JSON

`json` column or uses native `jsonb` type if possible, using the built-in `json` type in PostgreSQL defaulting to a `text` column in older versions of PostgreSQL or in unsupported databases.

In the model:

```js
{
  "attributes": {
    "maps": {
      "type": "json"
    }
  }
}
```

In a migration file, this generates:

```js
connection.schema.table('maps', function (table) {
  table.jsonb('location');
})
```

Note that when setting an "array" (or a value that could be an array) as the value, you should use `JSON.stringify()` to convert your value to a "string" prior to passing it to the query builder:

```js
strapi.connections.default.table('maps')
  .where({id: 1})
  .update({
    location: JSON.stringify(mightBeAnArray)
  });
```

This is because PostgreSQL has a native "array" type which uses a syntax incompatible with JSON; Strapi has no way of knowing which syntax to use, and calling `JSON.stringify()` forces JSON-style syntax.

#### Specific type

Sets a specific type for the column creation, if you'd like to add a column type that isn't supported here.

In the model:

```js
{
  "attributes": {
    "iDontHaveAnyExampleHere": {
      "type": "helloUnknownType"
    }
  }
}
```

In a migration file, this generates:

```js
connection.schema.table('articles', function (table) {
  table.specificType('iDontHaveAnyExampleHere', 'helloUnknownType');
})
```

### Validations

The following methods may be chained on the schema building methods, as modifiers to the column.

#### Uniqueness

Sets the column as unique.

In the model:

```js
{
  "attributes": {
    "username": {
      "type": "string",
      "unique": true
    }
  }
}
```

In a migration file, this generates:

```js
table.string('username').unique();
```

#### As primary key

Sets the field as the primary key for the table. To create a compound primary key, pass an array of column names in the table `options`.

In the model:

```js
{
  "attributes": {
    "uid": {
      "type": "bigInteger",
      "primary": true
    }
  }
}
```

In a migration file, this generates:

```js
table.bigInteger('uid').primary();
```

#### Default value

Sets the default value for the column on an insert.

In the model:

```js
{
  "attributes": {
    "country": {
      "type": "string",
      "defaultTo": "France"
    }
  }
}
```

In a migration file, this generates:

```js
table.string('country').defaultTo('France');
```

## Associations

Strapi handles "one-way", "one-to-one", "one-to-many", and "many-to-many" associations by defining relationships on models.

### One-way

A "one-way" association is where a model is associated with another model. You could query that model and populate to get the associated model. You can't however query the associated model and populate to get the associating model.

This kind of relation is also known as "belongs to".

In this example, we are associating a `User` with a `Article` but not a `Article` with a `User`. Because we have only formed an association on one of the models, an `Article` has no restrictions on the number of `User` models it can belong to. If we wanted to, we could change this and associate the `Article` with exactly one `User` and the `User` with exactly one `Article`.

The `User` model:

```js
{
  "tableName": "user",
  "attributes": {
    "article": {
      "model": "article"
    }
  }
}
```

Nothing is needed in the `Article` model regarding this relationship.

The migration looks like this:

```js
connection.schema.createTableIfNotExists('user', function (table) {
  table.increments();
  table.integer('article').references('article.id');
})
```

### One-to-one

A "one-to-one" association states that a model may only be associated with one other model.

This kind of relation is also known as "has one".

In this example A `User` can only have one `Article` and an `Article` can only have one `author` (`User`).

The `User` model:

```js
{
  "tableName": "user",
  "attributes": {
    "article": {
      "model": "article",
      "via": "author"
    }
  }
}
```

The `Article` model:

```js
{
  "tableName": "article",
  "attributes": {
    "author": {
      "model": "user"
    }
  }
}
```

The migration looks like this:

```js
connection.schema.createTableIfNotExists('article', function (table) {
  table.increments();
  table.integer('author').unsigned().unique().references('user.id');
}).catch(function (err) {
  console.log('Impossible to create the `article` table.');
  console.log(err);
}),

connection.schema.createTableIfNotExists('user', function (table) {
  table.increments();
  table.integer('article').unsigned().unique().references('article.id');
}).catch(function (err) {
  console.log('Impossible to create the `user` table.');
  console.log(err);
})
```

### One-to-many

A "one-to-many" association states that a model can be associated with many other models. To build this association a virtual attribute is added to a model using the `collection` property. In a "one-to-many" association one side must have a `collection` attribute and the other side must contain a `model` attribute. This allows the many side to know which records it needs to get.

Because you may want a model to have multiple "one-to-many" associations on another model a `via` key is needed on the `collection` attribute. This states which model attribute on the one side of the association is used to populate the records.

This kind of relation is also known as "has many".

In this example an `Article` can only have one `author` (`User`) and a `User` can have more than one `Article`.

The `User` model:

```js
{
  "tableName": "user",
  "attributes": {
    "articles": {
      "collection": "article",
      "via": "author"
    }
  }
}
```

The `Article` model:

```js
{
  "tableName": "article",
  "attributes": {
    "author": {
      "model": "user"
    }
  }
}
```

The migration looks like this:

```js
connection.schema.createTableIfNotExists('article', function (table) {
  table.increments();
  table.integer('author').references('user.id');
}).catch(function (err) {
  console.log('Impossible to create the `article` table.');
  console.log(err);
})
```

### Many-to-one

"One-to-many" and "many-to-one" relationships are the same. We just change our point of view from the `User` model or the `Article` model in our examples.

This kind of relation is also known as "belongs to one".

In this example a `User` can have more than one `Article` and an `Article` can only have one `author` (`User`).

The `Article` model:

```js
{
  "tableName": "article",
  "attributes": {
    "author": {
      "model": "user"
    }
  }
}
```

The `User` model:

```js
{
  "tableName": "user",
  "attributes": {
    "articles": {
      "collection": "article",
      "via": "author"
    }
  }
}
```

The migration looks like this:

```js
connection.schema.createTableIfNotExists('article', function (table) {
  table.increments();
  table.integer('author').references('user.id');
}).catch(function (err) {
  console.log('Impossible to create the `article` table.');
  console.log(err);
})
```

### Many-to-many

A "many-to-many" association states that a model can be associated with many other models and vice-versa. Because both models can have many related models a new join table will need to be created to keep track of these relations.

Strapi will look at your models and if it finds that two models both have `collection` attributes that point to each other, it will automatically build up a join table for you.

Because you may want a model to have multiple "many-to-many" associations on another model a `via` key is needed on the collection attribute. This states which model attribute on the one side of the association is used to populate the records.

This kind of relation is also known as "has and belongs to many".

Using the `User` and `Article` example lets look at how to build a schema where a `User` may have many `Article` records and a `Article` may have multiple owners.

The `User` model:

```js
{
  "tableName": "user",
  "attributes": {
    "articles": {
      "collection": "article",
      "via": "authors"
    }
  }
}
```

The `Article` model:

```js
{
  "tableName": "article",
  "attributes": {
    "authors": {
      "collection": "user",
      "via": "articles"
    }
  }
}
```

The migration looks like this:

```js
connection.schema.createTableIfNotExists('articles_authors__users_articles', function (table) {
  table.integer('user_id').unsigned().references('id').inTable('user');
  table.integer('article_id').unsigned().references('id').inTable('article');
}).catch(function (err) {
  console.log('Impossible to create the `articles_authors__users_articles` relation table.');
  console.log(err)
})
```
