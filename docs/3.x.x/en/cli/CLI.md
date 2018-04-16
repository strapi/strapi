# Command Line Interface (CLI)

Strapi comes with a full featured Command Line Interface (CLI) which lets you scaffold and manage your project in seconds.


***

## strapi new
Create a new project

```bash
strapi new <name>

options: [--dev|--dbclient=<dbclient> --dbhost=<dbhost> --dbport=<dbport> --dbname=<dbname> --dbusername=<dbusername> --dbpassword=<dbpassword>]
```

- **strapi new &#60;name&#62;**<br/>
  Generates a new project called **&#60;name&#62;** and installs the default plugins through the npm registry.

- **strapi new &#60;name&#62; --dev**<br/>
  Generates a new project called **&#60;name&#62;** and creates symlinks for the `./admin` folder and each plugin inside the `./plugin` folder. It means that the Strapi's development workflow has been set up on the machine earlier.

- **strapi new &#60;name&#62; --dbclient=&#60;dbclient&#62; --dbhost=&#60;dbhost&#62; --dbport=&#60;dbport&#62; --dbname=&#60;dbname&#62; --dbusername=&#60;dbusername&#62; --dbpassword=&#60;dbpassword&#62;**<br/>
  Generates a new project called **&#60;name&#62;** and skip the interactive database configuration and initilize with these options. **&#60;dbclient&#62;** can be `mongo`, `postgres`, `mysql`, `sqlite3` or `redis`. **&#60;dbusername&#62;** and **&#60;dbpassword&#62;** are optional.
  

  See the [CONTRIBUTING guide](https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md) for more details.

***

## strapi generate:api
Scaffold a complete API with its configurations, controller, model and service.

```bash
strapi generate:api <name> [<attribute:type>]

options: [--tpl <name>|--plugin <name>]
```

- **strapi generate:api &#60;name&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./api` folder at the root of your project.

- **strapi generate:api &#60;name&#62; &#60;attribute:type&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./api` folder at the root of your project. The model will already contain an attribute called **&#60;attribute&#62;** with the type property set to **&#60;type&#62;**.

  Example: `strapi generate:api product name:string description:text price:integer`

- **strapi generate:api &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./plugins/<plugin>` folder.

  Example: `strapi generate:api product --plugin content-manager`

- **strapi generate:api &#60;name&#62; --tpl &#60;template&#62;**<br/>
  Generates an API called **&#60;name&#62;** in the `./api` folder which works with the given **&#60;template&#62;**. By default, the generated APIs are based on Mongoose.

  Example: `strapi generate:api product --tpl bookshelf`

> Note: The first letter of the filename will be uppercased.

## strapi generate:controller
Create a new controller

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

> Note: The first letter of the filename will be uppercased.

## strapi generate:model
Create a new model

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


- **strapi generate:model &#60;name&#62; --plugin &#60;plugin&#62;**<br/>
  Generates an empty model called **&#60;name&#62;** in the `./plugins/<plugin>/models` folder.

> Note: The first letter of the filename will be uppercased.

## strapi generate:service
Create a new service

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

> Note: The first letter of the filename will be uppercased.

## strapi generate:policy
Create a new policy

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


Please refer to the [plugin develoment documentation](../plugin-development/quick-start.md) to know more.

***

## strapi install
Install a plugin in the project.

```bash
strapi install <name>

options: [--dev]
```

- **strapi install &#60;name&#62;**<br/>
  Installs a plugin called **&#60;name&#62;** in the `./plugins` folder.

  Example: `strapi install content-type-builder` will install the plugin at `./plugins/content-type-builder`.

- **strapi install &#60;name&#62; --dev**<br/>
  It will create a symlink from the local Strapi repository plugin folder called **&#60;name&#62;** in the `./plugins` folder.

  Example: `strapi install content-type-builder --dev` will create a symlink from `/path/to/the/repository/packages/strapi-plugin-content-type-builder` to `./plugins/content-type-builder`.

> Checkout the [CONTRIBUTING guide](https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md) for more details about the local Strapi development workflow.


> **Note: You have to restart the server to load the plugin into your project.**

Please refer to the [plugins documentation](../plugin-development/quick-start.md) to know more.

***

## strapi uninstall
Uninstall a plugin from the project.

```bash
strapi uninstall <name>
```

- **strapi uninstall &#60;name&#62;**<br/>
  Uninstalls a plugin called **&#60;name&#62;** in the `./plugins` folder.

  Example: `strapi uninstall content-type-builder` will remove the folder at `./plugins/content-type-builder`.


Please refer to the [plugins documentation](../plugin-development/quick-start.md) to know more.

***

## strapi version
Print the current globally installed Strapi version.

```bash
strapi version
```

***

## strapi help
List CLI commands.

```
strapi help
```
