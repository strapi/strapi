# Customization

## Plugin extensions

In strapi you can install plugins in your `node_modules`. This allows for easy updates and respect best practices. To customize those installed plugins you can work in the `/extensions` directory. It contains all the plugins' customizable files.

Certain plugins will create files in these folders so you can then modify them. You can also create certain files manually to add some custom configuration for example.

Depending on the plugins you will find extension documentation directly in the plugin's documentation.

Extensions folder structure:

- `extensions/`
  - `**`: Plugin Id
    - `admin`: You can extend a plugin's admin by create file with the same names and override certain methods
    - `config`: You can extend a plugin's configuration by add a settings.json file with your custom configuration
    - `models`: Contains the plugin's models that you have overwritten (e.g: When you add a relation to the User model)
    - `controllers`: You can extend the plugin's controllers by create controllers with the same names and override certain methods
    - `services`: You can extend the plugin's services by create services with the same names and override certain methods

## Admin extension

The admin panel is symilar as a plugin. It's a `node_module` exactly like a plugin.

To extend the admin panel you will have to create an `admin` folder in your application.

In this folder you will be able to override admin flies and functions.

::: note
For more details, visit the [admin panel constomization](../admin-panel/customization.md) documentation.
:::
