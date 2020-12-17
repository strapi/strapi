# Migration guide from 3.3.x to 3.4.0

**Make sure your server is not running until the end of the migration**

:::warning
If you are using **extensions** to create custom code or modifying existing code, you will need to update your code and compare your version to the new changes on the repository.
<br>
Not updating your **extensions** can break your app in unexpected ways that we cannot predict.
:::

## Migration

### Update the application dependencies

First, update the application dependencies as usual by following the basic [version update guide](../guides/update-version.md)

### Migrate configurations

In this new release we are introducing a new feature that will allow sorting on relations in the list view.
Currently this is disabled by default. To enable it, you would need to update every field configuration manually.

To help with this, here is a migration script to enable the sorting in the existing configuration.

> This migration step is **not required**. If you prefer doing the configuration updates manually, you can ignore it.

> This migration script changes the configuration stored in database. If you upgrade an application running in production, you will have to run the script on the production envrionment too.

What the script will do:

```
for each contentType
  -> for each sortable relational field
    -> enable sorting in the list view
```

**Run the script**

1. Download the migration script: <a :href="$withBase('/assets/migrations/scripts/migrate-3.4.0.js')" download>migrate-3.4.0.js</a>
2. Execute it with the following command: `node migrate-3.4.0.js [path-to-your-project]`
3. Delete the script

🎉 Congrats, your application has been migrated!
