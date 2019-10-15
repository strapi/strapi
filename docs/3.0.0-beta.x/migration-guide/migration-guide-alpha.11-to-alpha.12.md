# Migration guide from alpha.11 to alpha.12

This migration guide is a mix of migrations from 3.0.0-alpha.11.1 to 3.0.0-alpha.11.2, 3.0.0-alpha.11.2 to 3.0.0-alpha.11.3 and from 3.0.0-alpha.11.3 to 3.0.0-alpha.12.1.3.

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::


<br>

## Getting started

Install Strapi `alpha.12.1.3` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.12.1.3 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Configurations

You will have to update just 1 file: `package.json`

- Edit the Strapi's dependencies version: (move Strapi's dependencies to `3.0.0-alpha.12.1.3` version) in `package.json` file

```json
{
  "dependencies": {
    "lodash": "4.x.x",
    "strapi": "3.0.0-alpha.12.1.3",
    "strapi-mongoose": "3.0.0-alpha.12"
  }
}
```

<br>

## Update the Admin

Delete your old admin folder and replace it by the new one.

<br>

## Update the Plugins

Copy the fields and relations you had in your `/plugins/users-permissions/models/User.settings.json` and `/plugins/users-permissions/config/jwt.json` file in the new one.

Then, delete your old `plugins` folder and replace it by the new one.

<br>

## Update roles

::: note
This update is if you come from version before alpha-11.2
:::

Update `type` of `Guest` role to `public` in your database. You can also update name and description:

```json
{
  "name": "Public",
  "description": "Default role given to unauthenticated user.",
  "type": "public"
}
```

Create Authenticated role:

```json
{
  "name": "Authenticated",
  "description": "Default role given to authenticated user.",
  "type": "authenticated"
}
```

In `Users & Permissions > Advanced`  in admin panel update default role to `Authenticated`

You also will have to reset your roles permissions.

<br>

### Update bookshelf filters

::: note
This update is if you come from version before alpha-11.3
:::

You will have to replace your `fetchAll` services queries of your generated API:

```js
_.forEach(convertedParams.where, (where, key) => {
   if (_.isArray(where.value)) {
     for (const value in where.value) {
       qb[value ? 'where' : 'orWhere'](key, where.symbol, where.value[value])
     }
   } else {
     qb.where(key, where.symbol, where.value);
   }
 });

 if (convertedParams.sort) {
   qb.orderBy(convertedParams.sort.key, convertedParams.sort.order);
 }

 qb.offset(convertedParams.start);

 qb.limit(convertedParams.limit);
```

That's all, you have now upgraded to Strapi `alpha.12.1.3`.
