# Migration guide from 3.3.x to 3.4.0

**Make sure your server is not running until the end of the migration**

:::warning
If you are using **extensions** to create custom code or modifying existing code, you will need to update your code and compare your version to the new changes on the repository.
<br>
Not updating your **extensions** can break your app in unexpected ways that we cannot predict.
:::

## Migration

1. First, update your app as usual by following the basic [version update guide](../guides/update-version.md) and then come back here
2. Download this script: <a :href="$withBase('/assets/migrations/scripts/migrate-3.4.0.js')" download>migrate-3.4.0.js</a>
3. Execute it with the following command: `node migrate-3.4.0.js [path-to-your-project]`
4. Delete the script (optional)

That's it, now you can follow the basic [version update guide](../guides/update-version.md).
