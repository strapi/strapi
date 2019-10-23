# Customization

## Plugin extensions

In strapi you can install plugins in your `node_modules`. This allows for easy updates and respect best practices. To customize those installed plugins you can work in the `/extensions` directory. It contains all the plugins' customizable files.

Some plugins will create files in these folders so you can then modify them. You can also create certain files manually to add some custom configuration for example.

Extensions folder structure:

- `extensions/`
  - `**`: Plugin Id
    - `admin`: You can extend a plugin's admin by creating a file with the same name, doing so will override the original one.
    - `config`: You can extend a plugin's configuration by adding a settings.json file with your custom configuration
    - `models`: Contains the plugin's models that you have overwritten (e.g: When you add a relation to the User model)
    - `controllers`: You can extend the plugin's controllers by creating controllers with the same names and override certain methods
    - `services`: You can extend the plugin's services by creating services with the same names and override certain methods

## Admin extension

The admin panel is a `node_module` that is similar to a plugin but the slight difference that it encapsulate all the installed plugin of your application.

To extend this package you will have to create an `admin` folder at the root of your application.

In this folder you will be able to override admin files and functions.

::: note
For more details, visit the [admin panel customization](../admin-panel/customization.md) documentation.
:::
