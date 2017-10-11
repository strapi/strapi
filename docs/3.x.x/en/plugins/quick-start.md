# Quick start

You can install and uninstall any plugin you want.

## Plugin installation

```bash
strapin install <plugin-name>.
```
Installs a plugin, using the CLI.

### Basic usage

Considering you want to install a plugin named `content-manager` you can run the following command:
```bash
strapi install content-manager
```

This implies that this plugin is published on the npm registry as `strapi-plugin-content-manager`.

The command installs the plugin in the `node_modules` folder of your Strapi application, and then, move the plugin itself in the `./plugins` folder, so you can edit and version it.

### Development mode

In order to make contributors life easier, a command is dedicated to development mode:
`strapi install <plugin-name> --dev` (eg. `strapi install content-manager --dev`)

This command creates a symlink between the Strapi application and the plugin, which should have been previously installed globally (`npm link` or `npm install plugin-name -g`).

***

## Plugin uninstallation

```bash
strapi uninstall <plugin-name>
```
Allows the developer to uninstall a plugin, using the CLI.

### Basic usage

Command: `strapi uninstall <plugin-name>` (eg. `strapi uninstall content-manager`).

This command simply removes the plugin folder.

Please refer to the [CLI documentation](../cli/CLI.md) for more information.
