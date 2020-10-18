# Migration guide from 3.2.3 to 3.2.4

**Make sure your server is not running until the end of the migration**

:::warning
If you are using **extensions** to create custom code or modifying existing code, you will need to update your code and compare your version to the new changes on the repository.
<br>
Not updating your **extensions** can break your app in unexpected ways that we cannot predict.
:::

## Disclaimer

This version requires a migration in the following cases:

- You have extended the **Users-Permissions** **User** model and have the file `./extensions/users-permissions/models/User.settings.json`.

Otherwise you can follow the basic [version update guide](../guides/update-version.md).

## Migration

To fix a security issue, we have added a `confirmationToken` attribute in the **User** model.
If you have extended the model in any way, you will need to add the new attribute to the model in `./extensions/users-permissions/models/User.settings.json` following this example:

**Before**:

```json
{
  "attributes": {
    //...
  }
}
```

**After**:

```json
{
  "attributes": {
    //...
    "confirmationToken": {
      "type": "string",
      "configurable": false,
      "private": true
    }
  }
}
```

That's it, now you can follow the basic [version update guide](../guides/update-version.md).
