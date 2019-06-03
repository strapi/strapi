# API Documentation

Now that you have created your API it's really important to document its available end-points. The documentation plugin takes out most of your pain to generate your documentation. This plugin uses [SWAGGER UI](https://swagger.io/solutions/api-documentation/) to visualize your API's documentation.

If installed, this plugin will scan all the routes available from your `./api` folder and will try to create the appropriate documentation, infer on the parameters needed to create data, the responses you will receive.

You'll be able to visualize all your end-points directly from the SWAGGER UI.

## Installation

As usual run the following in your terminal:

```
# Go to your strapi project
$ cd my-strapi-project

# Install the documentation plugin using the CLI
$ strapi install documentation

# Start your server
$ strapi start
```

Once the plugin is installed it will create a `documentation` folder in each model of your project, so you can easily modify the default generated documentation. Then, each documentation file is merged into the `full_documentation.json` located in the plugin.

The administration panel lets you configure the basic settings of this plugin.

## Architecture and Generated Files

This plugin follows the OpenApi Specifications ([0AS.3.0.2](https://swagger.io/specification/)) and generates an OpenAPI Document called `full_documentation.json`.

### Plugin's architecture

```
./plugins
└─── documentation
|   └─── admin // The plugin's UI in the administration panel
|   |
|   └─── config // Contains the configurations of the plugin
|   |   └─── functions
|   |   |   └─── bootstrap.js // Logic to create the documentation file (if needed) when the server starts
|   |   |
|   |   └─── policies
|   |   |   └─── index.js // The plugin's policies
|   |   |
|   |   └─── routes.json // The plugin's available end-points
|   |   └─── settings.json // The OpenAPI Document basic settings
|   |
|   └─── controllers
|   |
|   └─── documentation // Folder containing your OpenAPI Documents
|   |    └─── 1.0.0 // OpenAPI Document's version
|   |    | └─── full_documentation.json // OpenAPI Document used by SWAGGER UI
|   |    |
|   |    └─── 2.0.0
|   |      └─── full_documentation.json
|   |
|   └─── middlewares
|   |   └─── documentation
|   |        └─── default.json
|   |        └─── index.js
|   |
|   └─── public
|   |    └─── index.html // SWAGGER UI
|   |    └─── login.html // Login page (customisable)
|   |
|   └─── services
|   |    └─── utils
|   |    |    └─── components.json // Default components automatically added to the OpenAPI Document
|   |    |
|   |    |    └─── forms.json // Form that is sent to the plugin's UI
|   |    |    └─── parametersOptions.json // Default parameters for GET requests
|   |    |    └─── unknownComponent.json // Component used when the algorithm can't infer the response schema
|   |    |
|   |    └─── Documentation.js // Plugin's service, most of the logic happens here
|   |
|   └─── package.json
|   |
|   └─── README.md // Contains some informations
```

### Generated files

When you start your server with this plugin installed it will automatically create the following files in your APIs (we will see how it works for the plugins). The plugin scans all the routes available in your model to create the `paths` field.

```
/my-strapi-project
    └─── admin
    |
    └─── api
         └─── Foo
             └── documentation // Folder added to your model
                 └── 1.0.0
                     └── foo.json // File containing all the paths where the responses can be infered
                     └── unclassified.json // File containing the manually added route of your `routes.json` file
                     |
                     └── overrides // Folder to override the generated documentation
```

## Basic Configurations

This plugin comes with an interface that is available in your administration panel and a configuration file.

### Administration Panel Settings

From your administration panel you can:

- Retrieve your jwt token(1):
- Restrict the access to your API's documentation
- Regenerate or delete a documentation
- Open/Update/Delete a specific documentation version

### Manual Configurations

The OpenAPI object (here the `full_documentation.json`) has the following structure:

```
{
  "openapi": "3.0.0" // do not change this version
  "info": {}
  "x-strapi-config": {},
  "servers" {} // Your servers config (it will be automated),
  "externalDocs": {},
  "paths": {} // All your Api routes,
  "tags": [] // Group of routes
  "components": {} // Default generated components and custom ones
}
```

The `openapi`, `info`, `x-strapi-config`, `servers`, `externalDocs` and `security` fields are located in the `./plugins/documentation/config/settings.json` file. Here you can specify all your environment variables, licences, external documentation and so one...
You can add all the entries listed in the [specification](https://swagger.io/specification/).

#### Usage of the `settings.json` File

**Do not change the `openapi` field of the `settings.json`.**

> **When you change a field in the settings.json file you need to manually restart your server.**

```
{
  "openapi": "3.0.0" // Do not change this version
  "info": {
    "version": "1.0.0" // Change this line to create a new version
     "title": "DOCUMENTATION",
    "description": "",
    "termsOfService": "YOUR_TERMS_OF_SERVICE_URL",
    "contact": {
      "name": "TEAM",
      "email": "contact-email@something.io",
      "url": "mywebsite.io"
    },
    "license": {
      "name": "Apache 2.0",
      "url": "https://www.apache.org/licenses/LICENSE-2.0.html"
    }
  }
  "x-strapi-config": {
    "path": "/documentation", // Change this line to change to url of the doc
    "showGeneratedFiles": true
  },
  "servers" [ // Your servers configuration you can add as many as you want
    {
      "url": "http://localhost:1337",
      "description": "Development server"
    },
    {
      "url": "YOUR_STAGING_SERVER",
      "description": "Staging server"
    },
    {
      "url": "YOUR_PRODUCTION_SERVER",
      "description": "Production server"
    }
  ],
  "externalDocs": {
    "description": "Find out more",
    "url": "https://strapi.io/documentation/3.0.0-alpha.x/"
  },
  "security": [ // This field is important to add your jwt token in the SWAGGER UI
    {
      "bearerAuth": []
    }
  ]
```

(1) _Strapi is secured by default which means that most of your end-points require your user to be authenticated. You will need to paste this token in your SWAGGER UI to try out your end-points._

## Overriding the Suggested Documentation

Currently the plugin writes a json file for each API.

In order to customize the responses or to add informations to a path you need to create a file in the associated `overrides/<file-name>.json` (the name of the file matters so make sure they are similar). Then you just need to identify the path you want to modify.
You can modify the default generated tags by adding a new one at the end of the file, it works the same way for the components.

**_NOTE 1_**

Overriding the `full_documentation.json` is a bad idea since it will be regenerated each time you change a model.

**_NOTE 2_**

You can easily modify the description, summary, parameters of a path however, for a response like the `200` you will need to write the full object. Take a look at the `./plugins/users-permissions/documentation/1.0.0/overrides/users-permissions-User.json` for a complete example.

**_NOTE 3_**

To modify your generated swagger files security on a specific model, for example to allow the public to use it, you will need to override the security for each path's action. For example with the route `/comments/count` typically all routes are protected by strapi, however if you allow the public role to use this without authentication you will need to override it in your model. See the below example:

```json
    "/comments/count": {
      "get": {
        "security": []
      }
    },
```

As you can see in that example, you are defining "no security" whereas normally you would need a bearer token to access. You will need to do this manually as the documentation plugin rewrites files and cannot pull permissions from the database as this would require a server restart each time the docs are updated.

## FAQ

### How does it generate the other plugins' documentation?

In order to display a plugin's end-point in the documentation you need to add a `description` key in the `config` object.

For example this is the plugin email `routes.json` file:

```
{
  "routes": [
    {
      "method": "POST",
      "path": "/",
      "handler": "Email.send",
      "config": {
        "policies": [],
        "description": "Send an email",
        "tag": {
          "plugin": "email",
          "name": "Email"
        }
      }
    },
    {
      "method": "GET",
      "path": "/environments",
      "handler": "Email.getEnvironments",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/settings/:environment",
      "handler": "Email.getSettings",
      "config": {
        "policies": []
      }
    },
    {
      "method": "PUT",
      "path": "/settings/:environment",
      "handler": "Email.updateSettings",
      "config": {
        "policies": []
      }
    }
  ]
}
```

In this file we have only one route that we want to reference in our documentation (`/`). Usually, the tag object is used for the SWAGGER UI, it will group this route under the `Email - Email` dropdown in the documentation. Furthermore, the algorithm will try to find the model to generate the best response possible. If the model is unknown it generates a response like the following `{ foo: "string" }` that you can easily override later.

There's another property to guide the algorithm to create the best response possible, the `actionType` key.
When we can't know by the controller name the type of the returned response (like `find` and `findOne`) you can specify it with this key. Here's an example from the `./plugins/users-permissions/config/routes.json` file.

```
{
  "method": "GET",
  "path": "/users/me",
  "handler": "User.me",
  "config": {
    "policies": [],
    "prefix": "",
    "description": "Retrieve the logged in user informations",
    "tag": {
      "plugin": "users-permissions",
      "name": "User",
      "actionType": "findOne"
    }
  }
}
```

### I have created a route in a common API (like product) that queries another model. How to automate this ?

You can use the `tag` key in your route. If you provide a `tag` which is a string like `"tag": "Product"` the algorithm will know that the end-point retrieves data from the **`Product`** table. Creating a tag object `{ "tag": { "name": "User", "plugin": "User-Permissions } }` will result in generating a response with the **`User`** model from the plugin users-permissions.
