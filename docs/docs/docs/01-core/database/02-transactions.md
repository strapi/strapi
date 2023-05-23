---
title: Transactions
description: Conceptual guide to transactions in Strapi
tags:
  - database
---

This provides an API to wrap a set of operations in a transaction that ensures the integrity of data.

## What are transactions

Transactions are a set of operations that are executed together as a single unit. If any of the operations fail, the entire transaction fails and the data is rolled back to its previous state. If all operations succeed, the transaction is committed and the data is permanently saved to the database.

## Usage

Transactions are handled by passing a handler function into `strapi.db.transaction`:

```js
await strapi.db.transaction(async ({ trx, rollback, commit, onCommit, onRollback }) => {
  // It will implicitly use the transaction
  await strapi.entityService.create();
  await strapi.entityService.create();
});
```

After the transaction handler is executed, the transaction is committed if all operations succeed. If any of the operations throws, the transaction is rolled back and the data is restored to its previous state.

:::note
Every `strapi.entityService` or `strapi.db.query` operation performed in a transaction block will implicitly use the transaction.
:::

### Transaction handler properties

The handler function receives an object with the following properties:

| Property     | Description                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------- |
| `trx`        | The transaction object. It can be used to perform knex queries within the transaction.      |
| `commit`     | Function to commit the transaction.                                                         |
| `rollback`   | Function to rollback the transaction.                                                       |
| `onCommit`   | Function to register a callback that will be executed after the transaction is committed.   |
| `onRollback` | Function to register a callback that will be executed after the transaction is rolled back. |

### Nested transactions

Transactions can be nested. When a transaction is nested, the inner transaction is committed or rolled back when the outer transaction is committed or rolled back.

```js
await strapi.db.transaction(async () => {
  // It will implicitly use the transaction
  await strapi.entityService.create();

  // Nested transactions will implicitly use the outer transaction
  await strapi.db.transaction(async ({}) => {
    await strapi.entityService.create();
  });
});
```

### onCommit and onRollback

The `onCommit` and `onRollback` hooks can be used to execute code after the transaction is committed or rolled back.

```js
await strapi.db.transaction(async ({ onCommit, onRollback }) => {
  // It will implicitly use the transaction
  await strapi.entityService.create();
  await strapi.entityService.create();

  onCommit(() => {
    // This will be executed after the transaction is committed
  });

  onRollback(() => {
    // This will be executed after the transaction is rolled back
  });
});
```

### Using knex queries

Transactions can also be used with knex queries.

```js
await strapi.db.transaction(async ({ trx, rollback, commit }) => {
  await knex('users').where('id', 1).update({ name: 'foo' }).transacting(trx);
});
```

## When to use transactions

Transactions should be used in cases where multiple operations should be executed together and their execution is dependent on each other. For example, when creating a user registration form, the transaction can be used to ensure that data is only committed to the database if all fields are properly filled out and validated.

## When not to use transactions

Transactions should not be used for small or simple sets of operations since it can result in performance penalties.

## Potential problems of transactions

Performing multiple operations within a transaction can lead to locking, which can block the execution of transactions from other processes until the original transaction is complete.

Furthermore, transactions can stall if they are not committed or rolled back appropriately.
