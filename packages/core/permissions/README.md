# Strapi Permissions

Highly customizable permission engine made for Strapi

## Get Started

```sh
yarn add @strapi/permissions
```

```javascript
const permissions = require('@strapi/permissions');

const engine = permissions.engine.new({ providers });

const ability = await engine.generateAbility([
  { action: 'read' },
  { action: 'delete', subject: 'foo' },
  { action: 'update', subject: 'bar', properties: { fields: ['foobar'] } },
  {
    action: 'create',
    subject: 'foo',
    properties: { fields: ['foobar'] },
    conditions: ['isAuthor'],
  },
]);

ability.can('read'); // true
ability.can('publish'); // false
ability.can('update', 'foo'); // false
ability.can('update', 'bar'); // true
```

- You need to give both an action and a condition provider as parameters when instantiating a new permission engine instance. They must be contained in a `providers` object property.
- You can also pass an `abilityBuilderFactory` to customize what kind of ability the `generateAbility` method will return. By default it'll use a `@casl/ability` builder.

You can also register to some hooks for each engine instance

```javascript
const permissions = require('@strapi/permissions');

const engine = permissions.engine
  .new({ providers })
  .on('before-format::validate.permission', ({ permission }) => {
    if (permission.action === 'read') {
      return false;
    }
  });

const ability = await engine.generateAbility([
  { action: 'read' },
  { action: 'delete', subject: 'foo' },
  { action: 'update', subject: 'bar', properties: { fields: ['foobar'] } },
  {
    action: 'create',
    subject: 'foo',
    properties: { fields: ['foobar'] },
    conditions: ['isAuthor'],
  },
]);

ability.can('read'); // false since the validation hook prevents the engine from registering the permission
ability.can('publish'); // false
ability.can('update', 'foo'); // false
ability.can('update', 'bar'); // true
```
