# Parameters

The available operators are separated in four different categories:

- [Filters](#Filters)
- [Sort](#sort)
- [Limit](#limit)
- [Start](#start)

## Filters

Filters are used as a suffix of a field name:

- Not suffix or `eq`: Equals
- `ne`: Not equals
- `lt`: Lower than
- `gt`: Greater than
- `lte`: Lower than or equal to
- `gte`: Greater than or equal to
- `in`: Included in an array of values
- `nin`: Isn't included in an array of values
- `contains`: Contains
- `ncontains`: Doesn't contain
- `containss`: Contains case sensitive
- `ncontainss`: Doesn't contain case sensitive
- `null`: Is null/Is not null

### Examples

#### Find users having `John` as first name.

`GET /users?firstName=John`
or
`GET /users?firstName_eq=John`

#### Find products having a price equal or greater than `3`.

`GET /products?price_gte=3`

#### Find multiple product with id 3, 6, 8

`GET /products?id_in=3&id_in=6&id_in=8`

#### Or clauses

If you use the same operator (except for in and nin) the values will be used to build an `OR` query

`GET /posts?title_contains=article&title_contains=truc`

## Deep filtering

Find posts written by a user who belongs to a company with the name equal to Strapi
`GET /posts?author.company.name=strapi`

::: warning
Querying your API with deep filters may cause performance issues.
If one of your deep filtering queries is too slow, we recommend building a custom route with an optimized version of your query.
:::

::: note
This feature doesn't allow you to filter nested models, e.g `Find users and only return their posts older than yesterday`.

To achieve this, there are two options:

- Either build a custom route or modify your services
- Use [GraphQL](./graphql.md#query-api)
  :::

::: warning
This feature isn't available for the `upload` plugin.
:::

## Sort

Sort according to a specific field.

### Example

Sort users by email.

- ASC: `GET /users?_sort=email:ASC`
- DESC: `GET /users?_sort=email:DESC`

Sorting on multiple fileds

- `GET /users?_sort=email:asc,dateField:desc`
- `GET /users?_sort=email:DESC,username:ASC`

## Limit

Limit the size of the returned results.

### Example

Limit the result length to 30.

`GET /users?_limit=30`

You can require the full data set by passing a limit equal to `-1`

## Start

Skip a specific number of entries (especially useful for pagination).

### Example

Get the second page of results.

`GET /users?_start=10&_limit=10`
