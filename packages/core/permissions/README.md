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

- You need to give both an action and a condition provider as parameter when instanciating a new permission engine instance. They must be contained in a `providers` object property.
- You can also pass an `abilityBuilderFactory` to customize what kind of ability the `generateAbility` method will return. By default it'll use a `@casl/ability` builder.

You can also register to some hooks for each engine instance.
See `lib/engine/hooks.js` -> `createEngineHooks` for available hooks.

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

ability.can('read'); // false since we didn't register the read permission because of the validation hook
ability.can('publish'); // false
ability.can('update', 'foo'); // false
ability.can('update', 'bar'); // true
```

The `format.permission` hook can be used to modify the permission.

```javascript
const permissions = require('@strapi/permissions');

const engine = permissions.engine
  .new({ providers })
  .on('pre-format::validate.permission', ({ permission }) => {
    if (permission.action === 'modify') {
      return false;
    }
  })
  .on('post-format::validate.permission', ({ permission }) => {
    if (permission.action === 'create') {
      return false;
    }
  })
  .on('format.permission', ({ permission }) => {
    if (permission.action === 'create') {
      return {
        ...permission,
        action: 'modify',
      };
    }
    if (permission.action === 'delete') {
      return {
        ...permission,
        action: 'remove',
      };
    }
    return permission;
  });

const ability = await engine.generateAbility([{ action: 'create' }, { action: 'delete' }]);

ability.can('create'); // false
ability.can('modify'); // true, because create was changed to 'modify'

ability.can('delete'); // false, doesn't exist because it was changed by format.permission
ability.can('remove'); // true, pre-format::validate.permission runs before format.permission
```
