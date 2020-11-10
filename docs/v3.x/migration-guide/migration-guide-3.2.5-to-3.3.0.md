# Migration guide from 3.2.5 to 3.3.0

**Make sure your server is not running until the end of the migration**

:::warning
If you are using **extensions** to create custom code or modifying existing code, you will need to update your code and compare your version to the new changes on the repository.
<br>
Not updating your **extensions** can break your app in unexpected ways that we cannot predict.
:::

## Disclaimer

This version requires a migration in the following cases:

- You have extended the **Strapi-admin** **admin/src/config.js** file, so you have `./admin/src/config.js`.

Otherwise you can follow the basic [version update guide](../guides/update-version.md).

## Migration

**Config file**

To invite users upgrading their application, we have introduced an application details page.
If you have extended the config file in any way, you will need to add the new constant to your extension in `./admin/src/config.js`

_Before_:

```js
export const LOGIN_LOGO = null;
export const SHOW_TUTORIALS = true;
export const SETTINGS_BASE_URL = '/settings';
```

_After_:

```js
export const LOGIN_LOGO = null;
export const SHOW_TUTORIALS = true;
export const SETTINGS_BASE_URL = '/settings';
export const STRAPI_UPDATE_NOTIF = true;
```

**Notification**

If you use the `strapi.notification` global to display notifications, you will be able to update them with the new api.

_Before_

```js
strapi.notification.success('app.notification.success');
```

_After_

```js
strapi.notification.toggle(config);
```

Here is a link to the [new notification API](../plugin-development/frontend-development.md).

That's it, now you can follow the basic [version update guide](../guides/update-version.md).
