# Command Line Interface (CLI)

Strapi comes with a full featured Command Line Interface (CLI) which lets you scaffold and manage your project in seconds.

## strapi new

Create a new project.

```bash
strapi new <name>

options: [--no-run|--use-npm|--debug|--quickstart|--dbclient=<dbclient> --dbhost=<dbhost> --dbport=<dbport> --dbname=<dbname> --dbusername=<dbusername> --dbpassword=<dbpassword> --dbssl=<dbssl> --dbauth=<dbauth> --dbforce]
```

- **strapi new &#60;name&#62;**<br/>
  Generates a new project called **&#60;name&#62;** and installs the default plugins through the npm registry.

- **strapi new &#60;name&#62; --debug**<br/>
  Will display the full error message if one is fired during the database connection.

- **strapi new &#60;name&#62; --quickstart**<br/>
  Use the quickstart system to create your app.

- **strapi new &#60;name&#62; --quickstart --no-run**<br/>
  Use the quickstart system to create your app, and do not start the application after creation.

- **strapi new &#60;name&#62; --dbclient=&#60;dbclient&#62; --dbhost=&#60;dbhost&#62; --dbport=&#60;dbport&#62; --dbname=&#60;dbname&#62; --dbusername=&#60;dbusername&#62; --dbpassword=&#60;dbpassword&#62; --dbssl=&#60;dbssl&#62; --dbauth=&#60;dbauth&#62; --dbforce**<br/>

  Generates a new project called **&#60;name&#62;** and skip the interactive database configuration and initialize with these options.

  - **&#60;dbclient&#62;** can be `mongo`, `postgres`, `mysql`.
  - **&#60;dbssl&#62;** and **&#60;dbauth&#62;** are available only for `mongo` and are optional.
  - **--dbforce** Allows you to overwrite content if the provided database is not empty. Only available for `postgres`, `mysql`, and is optional.

## strapi develop|dev

Start a Strapi application with autoReload enabled.

Strapi modifies/creates files at runtime and needs to restart when new files are created. To achieve this, `strapi develop` adds a file watcher and restarts the application when necessary.

```
strapi develop
options: [--no-build |--watch-admin |--browser ]
```

- **strapi develop**<br/>
  Starts your application with the autoReload enabled
- **strapi develop --no-build**<br/>
  Starts your application with the autoReload enabled and skip the administration panel build process
- **strapi develop --watch-admin**<br/>
  Starts your application with the autoReload enabled and the front-end development server. It allows you to customize the administration panel.
- **strapi develop --watch-admin --browser 'google chrome'**<br/>
  Starts your application with the autoReload enabled and the front-end development server. It allows you to customize the administration panel. Provide a browser name to use instead of the default one, `false` means stop opening the browser.

::: tip
You should never use this command to run a Strapi application in production.
:::

## strapi start

Start a Strapi application with autoReload disabled.

This commands is there to run a Strapi application without restarts and file writes (aimed at production usage).
Certain features are disabled in the `strapi start` mode because they require application restarts.

Allowed environment variables:
| Property | Description | Type | Default |
| --------- | ----------- | ----- | ------- |
| STRAPI_HIDE_STARTUP_MESSAGE | If `true` then Strapi will not show startup message on boot. Values can be `true` or `false` | string | `false` |
| STRAPI_LOG_LEVEL | Values can be 'fatal', 'error', 'warn', 'info', 'debug', 'trace' | string | `debug` |
| STRAPI_LOG_TIMESTAMP | Enables or disables the inclusion of a timestamp in the log message. Values can be `true` or `false` | string | `false`|
| STRAPI_LOG_FORCE_COLOR | Values can be `true` or `false` | string | `true` |
| STRAPI_LOG_PRETTY_PRINT | If pino-pretty module will be used to format logs. Values can be `true` or `false` | string | `true` |

## strapi build

Builds your admin panel.

```bash
strapi build

options: [--no-optimization]
```

- **strapi build**<br/>
  Builds the administration panel and minimizing the assets
- **strapi build --clean**<br/>
  Builds the administration panel and delete the previous build and .cache folders
- **strapi build --no-optimization**<br/>
  Builds the administration panel without minimizing the assets. The build duration is faster.

## strapi configuration:dump|config:dump

Dumps configurations to a file or stdout to help you migrate to production.

The dump format will be a JSON array.

```
strapi configuration:dump

Options:
  -f, --file <file>  Output file, default output is stdout
```

**Examples**

- `strapi configuration:dump -f dump.json`
- `strapi config:dump --file dump.json`
- `strapi config:dump > dump.json`

All these examples are equivalent.

::: warning
When configuring your application you often enter credentials for third party services (e.g authentication providers). Be aware that those credentials will also be dumped into the output of this command.
In case of doubt, you should avoid committing the dump file into a versioning system. Here are some methods you can explore:

- Copy the file directly to the environment you want and run the restore command there.
- Put the file in a secure location and download it at deploy time with the right credentials.
- Encrypt the file before committing and decrypt it when running the restore command.

:::

## strapi configuration:restore|config:restore

Restores a configuration dump into your application.

The input format must be a JSON array.

```
strapi configuration:restore

Options:
  -f, --file <file>          Input file, default input is stdin
  -s, --strategy <strategy>  Strategy name, one of: "replace", "merge", "keep". Defaults to: "replace"
```

**Examples**

- `strapi configuration:restore -f dump.json`
- `strapi config:restore --file dump.json -s replace`
- `cat dump.json | strapi config:restore`
- `strapi config:restore < dump.json`

All these examples are equivalent.

**Strategies**

When running the restore command, you can choose from three different strategies:

- **replace**: Will create missing keys and replace existing ones.
- **merge**: Will create missing keys and merge existing keys with their new value.
- **keep**: Will create missing keys and keep existing keys as is.

## strapi generate:api

Scaffold a complete API with its configurations, controller, model and service.

```bash
strapi generate:api <name> [<attribute:type>]

options: [--plugin <name>]
```

- **strapi generate:api &#60;name&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./api` folder at the root of your project.

- **strapi generate:api &#60;name&#62; &#60;attribute:type&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./api` folder at the root of your project. The model will already contain an attribute called **&#60;attribute&#62;** with the type property set to **&#60;type&#62;**.

  Example: `strapi generate:api product name:string description:text price:integer`

- **strapi generate:api &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./plugins/<plugin>` folder.

  Example: `strapi generate:api product --plugin content-manager`

::: tip
The first letter of the filename will be uppercase.
:::

## strapi generate:controller

Create a new controller.

```bash
strapi generate:controller <name>

options: [--api <name>|--plugin <name>]
```

- **strapi generate:controller &#60;name&#62;**<br/>
  Generates an empty controller called **&#60;name&#62;** in the `./api/<name>/controllers` folder.

  Example: `strapi generate:controller category` will create the controller at `./api/category/controllers/Category.js`.

- **strapi generate:controller &#60;name&#62; --api &#60;api&#62;**<br/>
  Generates an empty controller called **&#60;name&#62;** in the `./api/<api>/controllers` folder.

  Example: `strapi generate:controller category --api product` will create the controller at `./api/product/controllers/Category.js`.

- **strapi generate:controller &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an empty controller called **&#60;name&#62;** in the `./plugins/<plugin>/controllers` folder.

::: tip
The first letter of the filename will be uppercase.
:::

## strapi generate:model

Create a new model.

```bash
strapi generate:model <name> [<attribute:type>]

options: [--api <name>|--plugin <name>]
```

- **strapi generate:model &#60;name&#62;**<br/>
  Generates an empty model called **&#60;name&#62;** in the `./api/<name>/models` folder. It will create two files.
  The first one will be **&#60;name&#62;.js** which contains your lifecycle callbacks and another **&#60;name&#62;.settings.json** that will list your attributes and options.

  Example: `strapi generate:model category` will create these two files `./api/category/models/Category.js` and `./api/category/models/Category.settings.json`.

- **strapi generate:model &#60;name&#62; &#60;attribute:type&#62;**<br/>
  Generates an empty model called **&#60;name&#62;** in the `./api/<name>/models` folder. The file **&#60;name&#62;.settings.json** will already contain a list of attribute with their associated **&#60;type&#62;**.

  Example: `strapi generate:model category name:string description:text` will create these two files `./api/category/models/Category.js` and `./api/category/models/Category.settings.json`. This last file will contain two attributes `name` with the type `string` and `description` with type `text`.

- **strapi generate:model &#60;name&#62; --api &#60;api&#62;**<br/>
  Generates an empty model called **&#60;name&#62;** in the `./api/<api>/models` folder.

  Example: `strapi generate:model category --api product` will create these two files:

  - `./api/product/models/Category.js`
  - `./api/product/models/Category.settings.json`.

* **strapi generate:model &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an empty model called **&#60;name&#62;** in the `./plugins/<plugin>/models` folder.

::: tip
The first letter of the filename will be uppercase.
:::

## strapi generate:service

Create a new service.

```bash
strapi generate:service <name>

options: [--api <name>|--plugin <name>]
```

- **strapi generate:service &#60;name&#62;**<br/>
  Generates an empty service called **&#60;name&#62;** in the `./api/<name>/services` folder.

  Example: `strapi generate:service category` will create the service at `./api/category/services/Category.js`.

- **strapi generate:service &#60;name&#62; --api &#60;api&#62;**<br/>
  Generates an empty service called **&#60;name&#62;** in the `./api/<api>/services` folder.

  Example: `strapi generate:service category --api product` will create the service at `./api/product/services/Category.js`.

- **strapi generate:service &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an empty service called **&#60;name&#62;** in the `./plugins/<plugin>/services` folder.

::: tip
The first letter of the filename will be uppercase.
:::

## strapi generate:policy

Create a new policy.

```bash
strapi generate:policy <name>

options: [--api <name>|--plugin <name>]
```

- **strapi generate:policy &#60;name&#62;**<br/>
  Generates an empty policy called **&#60;name&#62;** in the `./config/policies` folder.

  Example: `strapi generate:policy isAuthenticated` will create the policy at `./config/policies/isAuthenticated.js`.

- **strapi generate:policy &#60;name&#62; --api &#60;api&#62;**<br/>
  Generates an empty policy called **&#60;name&#62;** in the `./api/<api>/config/policies` folder. This policy will be scoped and only accessible by the **&#60;api&#62;** routes.

  Example: `strapi generate:policy isAuthenticated --api product` will create the policy at `./api/product/config/policies/isAuthenticated.js`.

- **strapi generate:policy &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an empty policy called **&#60;name&#62;** in the `./plugins/<plugin>/config/policies` folder. This policy will be scoped and accessible only by the **&#60;plugin&#62;** routes.

## strapi generate:plugin

Create a new plugin skeleton.

```bash
strapi generate:plugin <name>
```

- **strapi generate:plugin &#60;name&#62;**<br/>
  Generates an empty plugin called **&#60;name&#62;** in the `./plugins` folder.

  Example: `strapi generate:plugin user` will create the plugin at `./plugins/user`.

Please refer to the [local plugins](../plugin-development/quick-start.md) section to know more.

## strapi install

Install a plugin in the project.

```bash
strapi install <name>
```

- **strapi install &#60;name&#62;**<br/>
  Installs a plugin called **&#60;name&#62;**.

  Example: `strapi install graphql` will install the plugin `strapi-plugin-graphql`

::: warning
Some plugins have admin panel integrations, your admin panel might have to be rebuilt. This can take some time.
:::

## strapi uninstall

Uninstall a plugin from the project.

```bash
strapi uninstall <name>

options [--delete-files]
```

- **strapi uninstall &#60;name&#62;**<br/>
  Uninstalls a plugin called **&#60;name&#62;**.

  Example: `strapi uninstall graphql` will remove the plugin `strapi-plugin-graphql`

- **strapi uninstall &#60;name&#62; --delete-files**<br/>
  Uninstalls a plugin called **&#60;name&#62;** and removes the files in `./extensions/name/`

  Example: `strapi uninstall graphql --delete-files` will remove the plugin `strapi-plugin-graphql` and all the files in `./extensions/graphql`

::: warning
Some plugins have admin panel integrations, your admin panel might have to be rebuilt. This can take some time.
:::

## strapi console

Start the server and eval commands in your application in real time.

```bash
strapi console
```

## strapi version

Print the current globally installed Strapi version.

```bash
strapi version
```

## strapi help

List CLI commands.

```
strapi help
```
