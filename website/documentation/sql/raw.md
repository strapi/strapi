# Raw

Sometimes you may need to use a raw expression in a query. Raw query object may be injected pretty much anywhere you want, and using proper bindings can ensure your values are escaped properly, preventing SQL-injection attacks.

## Raw Parameter Binding

One can parameterize SQL given to `strapi.connections.default.raw(sql, bindings)`. Parameters can be positional named. One can also choose if parameter should be treated as value or as SQL identifier e.g. in case of `TableName.ColumnName` reference.

```js
strapi.connections.default('users')
  .select(strapi.connections.default.raw('count(*) as user_count, status'))
  .where(strapi.connections.default.raw(1))
  .orWhere(strapi.connections.default.raw('status <> ?', [1]))
  .groupBy('status')
```

Positional bindings `?` is interpret as value and `??` as identifier:

```js
strapi.connections.default('users')
  .where(strapi.connections.default.raw('?? = ?', ['user.name', 1]))
```

Named bindings `:name` is interpret as value and `:name:` as identifier:

```js
strapi.connections.default('users')
  .where(strapi.connections.default.raw(':name: = :thisGuy or :name: = :otherGuy', {
    name: 'users.name',
    thisGuy: 'Bob',
    otherGuy: 'Jay'
  }))
```

For simpler queries where one only has a single binding, `.raw` can accept said binding as its second parameter :

```js
strapi.connections.default('users')
  .where(
    strapi.connections.default.raw('LOWER("login") = ?', 'strapi')
  )
  .orWhere(
    strapi.connections.default.raw('accesslevel = ?', 1)
  )
  .orWhere(
    strapi.connections.default.raw('updtime = ?', new Date())
  )
```

Note that due to ambiguity, arrays must be passed as arguments within a containing array :

```js
strapi.connections.default
  .raw('select * from users where id in (?)', [[1, 2, 3]])
```

To prevent replacement of `?` one can use escape sequence `\\?`.

```js
strapi.connections.default
  .select('*').from('users')
  .where('id', '=', 1)
  .whereRaw('?? \\? ?', ['jsonColumn', 'jsonKey'])
```

## Raw expressions

Raw expressions are created by using `strapi.connections.default.raw(sql, [bindings])` and passing this as a value for any value in the query chain.

```js
strapi.connections.default('users')
  .select(strapi.connections.default.raw('count(*) as user_count, status'))
  .where(strapi.connections.default.raw(1))
  .orWhere(strapi.connections.default.raw('status <> ?', [1]))
  .groupBy('status')
```
