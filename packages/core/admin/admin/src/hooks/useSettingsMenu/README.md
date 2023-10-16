### Promoting EE feature in CE projects

The `constants.js` file located in this folder displays EE feature inside CE projects in the settings menu if the `flags.promotEE` is not set to `false` in your `./config/admin/js` file. Everytime a new EE feature is added in Strapi, this file would require to be manually updated in order to add the menu link of the feature:

```js
...
 
 ...(!window.strapi.features.isEnabled(window.strapi.features.NEW_EE_FEATURE) &&
    window.strapi?.flags?.promoteEE
      ? [
          {
            intlLabel: {
              id: 'Settings.new-ee-feature.page.title',
              defaultMessage: 'NEW EE FEATURE',
            },
            to: '/settings/purchase-new-ee-feature',
            id: 'new-ee-feature',
            lockIcon: true,
          },
        ]
      : []),
...
```
