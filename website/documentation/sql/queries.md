# Query builder

The heart of the SQL dialect, the query builder is the interface used for building and executing standard SQL queries, such as `select`, `insert`, `update`, `delete`.

The query builder starts off either by specifying a `tableName` you wish to query against, or by calling any method directly on your connection object. This kicks off a jQuery-like chain, with which you can call additional query builder methods as needed to construct the query, eventually calling any of the interface methods, to either convert `toString`, or execute the query with a promise, callback, or stream.

## select methods

### select

`.select([*columns])` creates a `select` query, taking an optional array of columns for the query, eventually defaulting to `*` if none are specified when the query is built. The response of a select call will resolve with an array of objects selected from the database.

```js
strapi.connections.default
  .select('title', 'author', 'year').from('books')
```

```js
strapi.connections.default
  .select().table('books')
```

### column

`.column(columns)` specifically sets the columns to be selected on a `select` query, taking an array or a list of of column names.

```js
strapi.connections.default
  .column('title', 'author', 'year')
  .select().from('books')
```

```js
strapi.connections.default
  .column(['title', 'author', 'year'])
  .select().from('books')
```

### from

`.from([tableName])` specifies the table used in the current query, replacing the current table name if one has already been specified. This is typically used in the sub-queries performed in the advanced where or union methods.

```js
strapi.connections.default
  .select('*').from('users')
```

### withSchema

`.withSchema([schemaName])` specifies the schema to be used as prefix of table name.

```js
strapi.connections.default
  .withSchema('public')
  .select('*').from('users')
```

### where

`.where()` with object syntax:

```js
strapi.connections.default('users')
  .where({
    first_name: 'Test',
    last_name:  'User'
  })
  .select('id')
```

`.where()` with key / value:

```js
strapi.connections.default('users')
  .where('id', 1)
```

`.where()` with grouped chain:

```js
strapi.connections.default('users')
  .where(function() {
    this.where('id', 1).orWhere('id', '>', 10)
  })
  .orWhere({
    name: 'Tester'
  })
```

`.where()` with operator:

```js
strapi.connections.default('users')
  .where('votes', '>', 100)
```

```js
var subquery = strapi.connections.default('users')
  .where('votes', '>', 100)
  .andWhere('status', 'active')
  .orWhere('name', 'John')
  .select('id');

strapi.connections.default('accounts')
  .where('id', 'in', subquery)
```

### whereNot

`.whereNot()` with object syntax:

```js
strapi.connections.default('users')
  .whereNot({
    first_name: 'Test',
    last_name:  'User'
  })
  .select('id')
```

`.whereNot()` with key / value:

```js
strapi.connections.default('users')
  .whereNot('id', 1)
```

`.whereNot()` with grouped chain:

```js
strapi.connections.default('users')
  .whereNot(function() {
    this.where('id', 1).orWhereNot('id', '>', 10)
  })
  .orWhereNot({
    name: 'Tester'
  })
```

`.whereNot()` with operator:

```js
strapi.connections.default('users')
  .whereNot('votes', '>', 100)
```

`whereNot` is not suitable for `in` and `between` type subqueries. You should use `not in` and `not between` instead.

```js
var subquery = strapi.connections.default('users')
  .whereNot('votes', '>', 100)
  .andWhere('status', 'active')
  .orWhere('name', 'John')
  .select('id');

strapi.connections.default('accounts')
  .where('id', 'not in', subquery)
```

### whereIn

Shorthand for `.where('id', 'in', obj)`, the `.whereIn()` and `.orWhereIn()` methods add a "where in" clause to the query.

```js
strapi.connections.default
  .select('name').from('users')
  .whereIn('id', [1, 2, 3])
  .orWhereIn('id', [4, 5, 6])
```

```js
strapi.connections.default
  .select('name').from('users')
  .whereIn('account_id', function() {
    this.select('id').from('accounts');
  })
```

```js
var subquery = strapi.connections.default
  .select('id').from('accounts');

strapi.connections.default
  .select('name').from('users')
  .whereIn('account_id', subquery)
```

```js
strapi.connections.default('users')
  .where('name', '=', 'John')
  .orWhere(function() {
    this.where('votes', '>', 100)
      .andWhere('title', '<>', 'Admin');
  })
```

### whereNotIn

`.whereNotIn(column, array|callback|builder)` / `.orWhereNotIn`

```js
strapi.connections.default('users')
  .whereNotIn('id', [1, 2, 3])
```

```js
strapi.connections.default('users')
  .where('name', 'like', '%Test%')
  .orWhereNotIn('id', [1, 2, 3])
```

### whereNull

`.whereNull(column)` / `.orWhereNull`

```js
strapi.connections.default('users')
  .whereNull('updated_at')
```

### whereNotNull

`.whereNotNull(column)`/ `.orWhereNotNull`

```js
strapi.connections.default('users')
  .whereNotNull('created_at')
```

### whereExists

`.whereExists(builder | callback)` / `.orWhereExists`

```js
strapi.connections.default('users')
  .whereExists(function() {
    this.select('*').from('accounts')
      .whereRaw('users.account_id = accounts.id');
  })
```

```js
strapi.connections.default('users')
  .whereExists(strapi.connections.default
    .select('*').from('accounts')
    .whereRaw('users.account_id = accounts.id'))
```

### whereNotExists

`.whereNotExists(builder | callback)` / `.orWhereNotExists`

```js
strapi.connections.default('users')
  .whereNotExists(function() {
    this.select('*').from('accounts')
      .whereRaw('users.account_id = accounts.id');
  })
```

```js
strapi.connections.default('users')
  .whereNotExists(strapi.connections.default
    .select('*').from('accounts')
    .whereRaw('users.account_id = accounts.id'))
```

### whereBetween

`.whereBetween(column, range)` / `.orWhereBetween`

```js
strapi.connections.default('users')
  .whereBetween('votes', [1, 100])
```

### whereNotBetween

`.whereNotBetween(column, range)` / `.orWhereNotBetween`

```js
strapi.connections.default('users')
  .whereNotBetween('votes', [1, 100])
```

### whereRaw

`.whereRaw(query, [bindings])` is a convenience helper for `.where(strapi.connections.default.raw(query))`.

```js
strapi.connections.default('users')
  .whereRaw('id = ?', [1])
```

### join

The `.join(table, first, [operator], second)` builder can be used to specify joins between tables, with the first argument being the joining table, the next three arguments being the first join column, the join operator and the second join column, respectively.

```js
strapi.connections.default('users')
  .join('contacts', 'users.id', '=', 'contacts.user_id')
  .select('users.id', 'contacts.phone')
```

```js
strapi.connections.default('users')
  .join('contacts', 'users.id', 'contacts.user_id')
  .select('users.id', 'contacts.phone')
```

For grouped joins, specify a function as the second argument for the join query, and use `on` with `orOn` or `andOn` to create joins that are grouped with parentheses.

```js
strapi.connections.default
  .select('*').from('users')
  .join('accounts', function() {
    this.on('accounts.id', '=', 'users.account_id')
      .orOn('accounts.owner_id', '=', 'users.id')
  })
```

It is also possible to use an object to represent the join syntax.

```js
strapi.connections.default
  .select('*').from('users')
  .join('accounts', {
    'accounts.id': 'users.account_id'
  })
```

If you need to use a literal value (string, number, or boolean) in a join instead of a column, use `strapi.connections.default.raw`.

```js
strapi.connections.default
  .select('*').from('users')
  .join('accounts', 'accounts.type', strapi.connections.default.raw('?', ['admin']))
```

### innerJoin

```js
strapi.connections.default
  .from('users')
  .innerJoin('accounts', 'users.id', 'accounts.user_id')
```

```js
strapi.connections.default
  .table('users')
  .innerJoin('accounts', 'users.id', '=', 'accounts.user_id')
```

```js
strapi.connections
  .default('users').innerJoin('accounts', function() {
    this.on('accounts.id', '=', 'users.account_id')
      .orOn('accounts.owner_id', '=', 'users.id')
  })
```

### leftJoin

```js
strapi.connections.default
  .select('*').from('users')
  .leftJoin('accounts', 'users.id', 'accounts.user_id')
```

```js
strapi.connections.default
  .select('*').from('users')
  .leftJoin('accounts', function() {
    this.on('accounts.id', '=', 'users.account_id')
      .orOn('accounts.owner_id', '=', 'users.id')
  })
```

### leftOuterJoin

```js
strapi.connections.default
  .select('*').from('users')
  .leftOuterJoin('accounts', 'users.id', 'accounts.user_id')
```

```js
strapi.connections.default
  .select('*').from('users')
  .leftOuterJoin('accounts', function() {
    this.on('accounts.id', '=', 'users.account_id')
      .orOn('accounts.owner_id', '=', 'users.id')
  })
```

### rightJoin

```js
strapi.connections.default
  .select('*').from('users')
  .rightJoin('accounts', 'users.id', 'accounts.user_id')
```

```js
strapi.connections.default
  .select('*').from('users')
  .rightJoin('accounts', function() {
    this.on('accounts.id', '=', 'users.account_id')
      .orOn('accounts.owner_id', '=', 'users.id')
  })
```

### rightOuterJoin

```js
strapi.connections.default
  .select('*').from('users')
  .rightOuterJoin('accounts', 'users.id', 'accounts.user_id')
```

```js
strapi.connections.default
  .select('*').from('users')
  .rightOuterJoin('accounts', function() {
    this.on('accounts.id', '=', 'users.account_id')
      .orOn('accounts.owner_id', '=', 'users.id')
  })
```

### outerJoin

```js
strapi.connections.default
  .select('*').from('users')
  .outerJoin('accounts', 'users.id', 'accounts.user_id')
```

```js
strapi.connections.default
  .select('*').from('users')
  .outerJoin('accounts', function() {
    this.on('accounts.id', '=', 'users.account_id')
      .orOn('accounts.owner_id', '=', 'users.id')
  })
```

### fullOuterJoin

```js
strapi.connections.default
  .select('*').from('users')
  .fullOuterJoin('accounts', 'users.id', 'accounts.user_id')
```

```js
strapi.connections.default
  .select('*').from('users')
  .fullOuterJoin('accounts', function() {
    this.on('accounts.id', '=', 'users.account_id')
      .orOn('accounts.owner_id', '=', 'users.id')
  })
```

### crossJoin

```js
strapi.connections.default
  .select('*').from('users')
  .crossJoin('accounts', 'users.id', 'accounts.user_id')
```

```js
strapi.connections.default
  .select('*').from('users')
  .crossJoin('accounts', function() {
    this.on('accounts.id', '=', 'users.account_id')
      .orOn('accounts.owner_id', '=', 'users.id')
  })
```

### joinRaw

```js
strapi.connections.default
  .select('*').from('accounts')
  .joinRaw('natural full join table1')
  .where('id', 1)
```

```js
strapi.connections.default
  .select('*').from('accounts')
  .join(strapi.connections.default.raw('natural full join table1'))
  .where('id', 1)
```

### distinct

`.distinct()` sets a "distinct" clause on the query.

```js
strapi.connections.default('customers')
  .distinct('first_name', 'last_name')
  .select()
```

### groupBy

`.groupBy(*names)` adds a "group by" clause to the query.

```js
strapi.connections.default('users')
  .groupBy('count')
```

### groupByRaw

`.groupBy(sql)` adds a raw "group by" clause to the query.

```js
strapi.connections.default
  .select('year', strapi.connections.default.raw('SUM(profit)')).from('sales')
  .groupByRaw('year WITH ROLLUP')
```

### orderBy

`.orderBy(column, [direction])` adds an "order by" clause to the query.

```js
strapi.connections.default('users')
  .orderBy('name', 'desc')
```

### orderByRaw

`.orderByRaw(sql)` adds an "order by raw" clause to the query.

```js
strapi.connections.default
  .select('*').from('table')
  .orderByRaw('col NULLS LAST DESC')
```

### having

`.having(column, operator, value)` adds a "having" clause to the query.

```js
strapi.connections.default('users')
  .groupBy('count')
  .orderBy('name', 'desc')
  .having('count', '>', 100)
```

### havingRaw

`.havingRaw(column, operator, value)` adds a "havingRaw" clause to the query.

```js
strapi.connections.default('users')
  .groupBy('count')
  .orderBy('name', 'desc')
  .havingRaw('count > ?', [100])
```

### first

`.first([columns])` similar to `select`, but only retrieves & resolves with the first record from the query.

```js
strapi.connections.default
  .table('users')
  .first('id', 'name')
  .then(function(row) {
    console.log(row);
  });
```

### offset

`.offset(value)` adds an "offset" clause to the query.

```js
strapi.connections.default
  .select('*').from('users')
  .offset(10)
```

### limit

`.limit(value)` adds a "limit" clause to the query.

```js
strapi.connections.default
  .select('*').from('users')
  .limit(10)
  .offset(30)
```

### union

`.union([*queries], [wrap])` creates a "union" query, taking an array or a list of callbacks to build the union statement, with optional boolean wrap. The queries will be individually wrapped in parentheses with a `true` wrap parameter.

```js
strapi.connections.default
  .select('*').from('users')
  .whereNull('last_name')
  .union(function() {
    this.select('*').from('users')
      .whereNull('first_name');
  })
```

### unionAll

`.unionAll(query)` creates a "union all" query, with the same method signature as the `union` method.

```js
strapi.connections.default
  .select('*').from('users')
  .whereNull('last_name')
  .unionAll(function() {
    this.select('*').from('users')
      .whereNull('first_name');
  })
```

### count

`.count(column)` performs a count on the specified column. Note that in PostgreSQL, `count` returns a "bigint" type which will be a "string" and not a "number".

```js
strapi.connections.default('users')
  .count('active')
```

```js
strapi.connections.default('users')
  .count('active as a')
```

Use `countDistinct` to add a distinct expression inside the aggregate function.

```js
strapi.connections.default('users')
  .countDistinct('active')
```

### min

`.min(column)` gets the minimum value for the specified column.

```js
strapi.connections.default('users')
  .min('age')
```

```js
strapi.connections.default('users')
  .min('age as a')
```

### max

`.max(column)` gets the maximum value for the specified column.

```js
strapi.connections.default('users')
  .max('age')
```

```js
strapi.connections.default('users')
  .max('age as a')
```

### sum

`.sum(column)` retrieves the sum of the values of a given column.

```js
strapi.connections.default('users')
  .sum('products')
```

```js
strapi.connections.default('users')
  .sum('products as p')
```

Use `sumDistinct` to add a distinct expression inside the aggregate function.

```js
strapi.connections.default('users')
  .sumDistinct('products')
```

### avg

`.avg(column)` retrieves the average of the values of a given column.

```js
strapi.connections.default('users')
  .avg('age')
```

```js
strapi.connections.default('users')
  .avg('age as a')
```

Use `avgDistinct` to add a distinct expression inside the aggregate function.

```js
strapi.connections.default('users')
  .avgDistinct('age')
```

## insert methods

### insert

`.insert(data, [returning])` creates an "insert" query, taking either a hash of properties to be inserted into the row, or an array of inserts, to be executed as a single insert command. Resolves the promise / fulfills the callback with an array containing the first insert id of the inserted model, or an array containing all inserted `ids` for PostgreSQL.

```js
strapi.connections.default('books')
  .insert({
    title: 'Slaughterhouse Five'
  })
```

```js
strapi.connections.default('coords')
  .insert([
    {
      x: 20
    }, {
      y: 30
    },  {
      x: 10,
      y: 20
    }
  ])
```

```js
strapi.connections.default.insert([
    {
      title: 'Great Gatsby'
    }, {
      title: 'Fahrenheit 451'
    }
  ], 'id')
  .into('books')
```

If one prefers that undefined keys are replaced with `NULL` instead of `DEFAULT` one may give `useNullAsDefault` configuration parameter in your connection config.

```js
{
  "connections": {
    "default": {
      "client": "postgresql",
      "debug": false,
      "acquireConnectionTimeout": 60000,
      "connection": {
        "host": "",
        "user": "",
        "password": "",
        "database": ""
      },
      "pool": {
        "min": 2,
        "max": 10
      },
      "migrations": {
        "tableName": "migrations"
      }
      "useNullAsDefault": true
    }
  }
}
```

```js
strapi.connections.default('coords')
  .insert([
    {
      x: 20
    }, {
      y: 30
    }, {
      x: 10,
      y: 20
    }
  ])
```

## update methods

### update

`.update(data, [returning])` / `.update(key, value, [returning])` creates an "update" query, taking a hash of properties or a key/value pair to be updated based on the other query constraints. Resolves the promise / fulfills the callback with the number of affected rows for the query. If a key to be updated has value `undefined` it is ignored.

```js
strapi.connections.default('books')
  .where('published_date', '<', 2000)
  .update({
    status: 'archived',
    thisKeyIsSkipped: undefined
  })
```

```js
strapi.connections.default('books')
  .update('title', 'Slaughterhouse Five')
```

### increment

`.increment(column, amount)` increments a column value by the specified amount.

```js
strapi.connections.default('accounts')
  .where('userid', '=', 1)
  .increment('balance', 10)
```

### decrement

`.decrement(column, amount)` decrements a column value by the specified amount.

```js
strapi.connections.default('accounts')
  .where('userid', '=', 1)
  .decrement('balance', 5)
```

## delete methods

### del / delete

`.del()` aliased to `del` as `delete` is a reserved word in JavaScript, this method deletes one or more rows, based on other conditions specified in the query. Resolves the promise / fulfills the callback with the number of affected rows for the query.

```js
strapi.connections.default('accounts')
  .where('activated', false)
  .del()
```

## Other methods

### returning

`.returning(column)` only used by PostgreSQL databases, the returning method specifies which column should be returned by the insert and update methods.

```js
strapi.connections.default('books')
  .returning('id')
  .insert({
    title: 'Slaughterhouse Five'
  })
```

```js
strapi.connections.default('books')
  .returning('id')
  .insert([
    {
      title: 'Great Gatsby'
    },
    {
      title: 'Fahrenheit 451'
    }
  ])
```

### as

`.as(name)` allows for aliasing a subquery, taking the string you wish to name the current query. If the query is not a sub-query, it will be ignored.

```js
strapi.connections.default.avg('sum_column1')
  .from(function() {
    this.sum('column1 as sum_column1')
      .from('t1')
      .groupBy('column1')
      .as('t1')
  })
  .as('ignored_alias')
```

### transacting

The `.transacting(transactionObj)` method may be chained to any query and passed the object you wish to join the query as part of the transaction for.

```js
var Promise = require('bluebird');

strapi.connections.default.transaction(function(trx) {
  strapi.connections.default('books').transacting(trx)
    .insert({
      name: 'Old Books'
    })
    .then(function(resp) {
      var id = resp[0];
      return someExternalMethod(id, trx);
    })
    .then(trx.commit)
    .catch(trx.rollback);
}).then(function(resp) {
  console.log('Transaction complete.');
}).catch(function(err) {
  console.error(err);
});
```

#### forUpdate

`.transacting(t).forUpdate()` dynamically added after a transaction is specified, the `forUpdate` adds a "FOR UPDATE" in PostgreSQL and MySQL during a select statement.

```js
strapi.connections.default('tableName')
  .transacting(trx)
  .forUpdate()
  .select('*')
```

#### forShare

`.transacting(t).forShare()` dynamically added after a transaction is specified, the `forShare` adds a "FOR SHARE" in PostgreSQL and a "LOCK IN SHARE MODE" for MySQL during a select statement.

```js
strapi.connections.default('tableName')
  .transacting(trx)
  .forShare()
  .select('*')
```

### truncate

`.truncate()` truncates the current table.

```js
strapi.connections.default('accounts')
  .truncate()
```

### pluck

`.pluck(id)` this will pluck the specified column from each row in your results, yielding a promise which resolves to the array of values selected.

```js
strapi.connections.default.table('users')
  .pluck('id')
  .then(function(ids) {
    console.log(ids);
  });
```

### columnInfo

`.columnInfo([columnName])` returns an object with the column info about the current table, or an individual column if one is passed, returning an object with the following keys:

- `defaultValue`: the default value for the column.
- `type`: the column type.
- `maxLength`: the max length set for the column.
- `nullable`: whether the column may be null.

```js
strapi.connections.default('users')
  .columnInfo()
  .then(function(info) {
    // ...
  });
```
