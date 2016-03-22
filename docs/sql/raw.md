---
title: Raw
---

Sometimes you may need to use a raw expression in a query. Raw query object may be injected pretty much anywhere you want, and using proper bindings can ensure your values are escaped properly, preventing SQL-injection attacks.

> In this document we assume the `connection` is one of the `connections` set in your config.
  ```js
  const connection = strapi.connections.default;
  ```

## Raw Parameter Binding

One can parameterize SQL given to `connection.raw(sql, bindings)`. Parameters can be positional named. One can also choose if parameter should be treated as value or as SQL identifier e.g. in case of `TableName.ColumnName` reference.

```js
connection('users')
  .select(connection.raw('count(*) as user_count, status'))
  .where(connection.raw(1))
  .orWhere(connection.raw('status <> ?', [1]))
  .groupBy('status')
```

Positional bindings `?` is interpret as value and `??` as identifier:

```js
connection('users').where(connection.raw('?? = ?', ['user.name', 1]))
```

Named bindings `:name` is interpret as value and `:name:` as identifier:

```js
connection('users')
  .where(connection.raw(':name: = :thisGuy or :name: = :otherGuy', {
    name: 'users.name',
    thisGuy: 'Bob',
    otherGuy: 'Jay'
  }))
```

For simpler queries where one only has a single binding, `.raw` can accept said binding as its second parameter :

```js
connection('users')
  .where(
    connection.raw('LOWER("login") = ?', 'strapi')
  )
  .orWhere(
    connection.raw('accesslevel = ?', 1)
  )
  .orWhere(
    connection.raw('updtime = ?', new Date())
  )
```

Note that due to ambiguity, arrays must be passed as arguments within a containing array :

```js
connection.raw('select * from users where id in (?)', [[1, 2, 3]])
```

To prevent replacement of `?` one can use escape sequence `\\?`.

```js
connection.select('*').from('users').where('id', '=', 1).whereRaw('?? \\? ?', ['jsonColumn', 'jsonKey'])
```

## Raw expressions

Raw expressions are created by using `connection.raw(sql, [bindings])` and passing this as a value for any value in the query chain.

```js
connection('users')
  .select(connection.raw('count(*) as user_count, status'))
  .where(connection.raw(1))
  .orWhere(connection.raw('status <> ?', [1]))
  .groupBy('status')
```
