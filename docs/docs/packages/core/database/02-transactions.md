---
title: Transactions
description: Conceptual guide to transactions in Strapi
---

:::caution
This is an experimental feature and is subject to change in future versions.
:::

An API to wrap a set of operations in a transaction that ensures the integrity of data.

## What are transactions

Transactions are a set of operations that are executed together as a single unit. If any of the operations fail, the entire transaction fails and the data is rolled back to its previous state. If all operations succeed, the transaction is committed and the data is permanently saved to the database.

## Usage

Transactions are handled by passing a handler function into `strapi.db.transaction`:

```js
await strapi.db.transaction(async ({ trx, rollback, commit, onCommit, onRollback }) => {
  // It will implicitly use the transaction
  await strapi.db.create();
  await strapi.db.create();
});
```

After the transaction handler is executed, the transaction is committed if all operations succeed. If any of the operations throws, the transaction is rolled back and the data is restored to its previous state.

`onCommit` and `onRollback` callbacks run after the outermost transaction commits or rolls back. `strapi.db.transaction` resolves without waiting for them, so a write stays as fast as the database commit. Callbacks from the same commit or rollback run together. A failing callback is logged, the others still run, and the call has already resolved. The commit has already succeeded, so a commit-callback error does not roll it back. A rollback-callback error does not replace the error that caused the rollback. `db.destroy()` waits up to 10 seconds for hooks that belong to that database, then closes the connection pool. Hooks still running at the deadline are left running. Another database in the same process does not wait for them. `onCommit` runs once, after a successful commit.

:::note
Every `strapi.db.query` operation performed in a transaction block will implicitly use the transaction.
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
  await strapi.db.create();

  // Nested transactions will implicitly use the outer transaction
  await strapi.db.transaction(async ({}) => {
    await strapi.db.create();
  });
});
```

A nested transaction has no savepoint of its own: an error inside it that is caught in the outer transaction does not undo the writes it made before the error.

### Savepoints

To undo only part of a transaction, run it in `strapi.db.savepoint`. If the callback throws, its writes are rolled back, the `onCommit` callbacks registered inside it are dropped (its `onRollback` callbacks run), and the error is rethrown; the transaction stays usable, on Postgres also after a database error. On MySQL, a deadlock rolls back the whole transaction, not just the savepoint. If it resolves, its writes and callbacks join the transaction. It throws outside a transaction.

If the database rejects releasing the savepoint or rolling back to it, typically because it already rolled back the whole transaction (a MySQL deadlock, or a lock wait timeout with `innodb_rollback_on_timeout`), `savepoint` throws a `SavepointError` (`errors.SavepointError` from `@strapi/database`), after running the savepoint's `onRollback` callbacks. Its `cause` is the database's error, and `details.error` what the callback threw, if it threw. Knex itself resolves a savepoint's `commit()`/`rollback()` in that case: only the transactor's `executionPromise` rejects, and on MySQL not even that for a savepoint that no longer exists (`ER_SP_DOES_NOT_EXIST`), which knex takes for an implicit commit by DDL and only logs as `Transaction was implicitly committed`. `savepoint` reads the error from the transactor's `query-error` event instead. Without this, the caller would go on as if the savepoint had ended, on MySQL outside any transaction. Don't catch it to carry on: let the transaction fail with it.

```js
await strapi.db.transaction(async () => {
  for (const entry of entries) {
    try {
      await strapi.db.savepoint(() =>
        strapi.documents(uid).publish({ documentId: entry.documentId })
      );
    } catch {
      // Only this entry's writes are rolled back, the others stay
    }
  }
});
```

### onCommit and onRollback

The `onCommit` and `onRollback` hooks can be used to execute code after the transaction is committed or rolled back.

```js
await strapi.db.transaction(async ({ onCommit, onRollback }) => {
  // It will implicitly use the transaction
  await strapi.db.create();
  await strapi.db.create();

  onCommit(() => {
    // This will be executed after the transaction is committed
  });

  onRollback(() => {
    // This will be executed after the transaction is rolled back
  });
});
```

### Using knex queries

Transactions can also be used with knex queries, but in those cases `.transacting(trx)` must be explicitly called.

```js
await strapi.db.transaction(async ({ trx, rollback, commit }) => {
  await knex('users').where('id', 1).update({ name: 'foo' }).transacting(trx);
});
```

## When to use transactions

Transactions should be used when several database operations must succeed or fail together. For example, creating a user and the profile row that belongs to them. If creating the profile throws, the user insert is rolled back too.

A side effect that must not happen for a rolled-back write, such as a welcome email, does not belong in the handler. Register the email with `onCommit`. It is sent once, after the commit. The transaction call returns before that send finishes. If the handler fails, the email is not sent. If the email fails, the user row stays, because the commit has already happened.

## When not to use transactions

Transactions should not be used for operations that are not dependent on each other since it can result in performance penalties.

## Potential problems of transactions

Performing multiple operations within a transaction can lead to locking, which can block the execution of transactions from other processes until the original transaction is complete.

Furthermore, transactions can stall if they are not committed or rolled back appropriately.

For example, if a transaction is opened but there is a path in your code that does not close it, the transaction will be left open indefinitely and could cause instability until your server is restarted and the connection is forced to close. These issues can be difficult to debug, so use transactions with care in the cases they are necessary.
