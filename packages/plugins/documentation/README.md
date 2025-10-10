# Plugin documentation

This plugin automates your API documentation creation. It basically generates a swagger file. It follows the [Open API specification version 3.0.1](https://swagger.io/specification/).

## Usage

- Config
- Creating a new documentation version
- Generated files
  - full_documentation.json structure
- Overriding the suggested documentation
- FAQ
  - How does it generate the others plugins documentation ?
  - I have created a route into a common API (like product) that query another model. How to automate this?
- TODO

### Config

Create a `settings.json` file located in `src/extensions/documentation/config` folder where you can specify all your environment variables, licenses, external documentation and so one...
You can add all the entries listed in the [specification](https://swagger.io/specification/).

_NOTE_ if you need to add a custom key you can do it by prefixing your key by `x-{something}`

### Creating a new documentation version

In order to create a new version you need to change the `info.version` key in the `settings.json` file.

This will automatically create a new version.

### Generated files

When you start your server with this plugin installed it will automatically create the following files in your APIs (we will see how it works for the plugins).

- api
  - my-api
    - documentation
      - documentationVersion // 1.0.0
        - my-api.json // File containing all the identified path
        - unclassified.json // File containing the manually added paths
        - overrides // Folder to override the generated documentation
- plugins
  - ...
  - documentation
    - documentation
      - 1.0.0
        - full_documentation.json

#### full_documentation.json

The combined documentation is merged into the `full_documentation.json` file and it's located in `src/extensions/documentation/documentation/{version}/full_documentation.json`

It has the following structure

```
{
  "openapi": "3.0.0", // do not change this version
  "info": {
    "version": "1.0.0" // change this line to create a new version
    ...
  },
  "x-strapi-config": {
    "showGeneratedFiles": true // Do not change this line at the moment...
  },
  "servers": {}, // Your servers config (it will be automated)
  "externalDocs": {},
  "paths": {}, // All your Api routes
  "tags": [], // Group of route
  "components": {} // Default generated components and custom ones
}
```

### Overriding the suggested documentation

Currently the plugin writes a json file for each API.

In order to customize the responses or to add information to a path you need to create a file in the associated `overrides/<file-name>.json` (the name of the file matters so make sure they are similar). Then you just need to identify the path you want to modify.
You can modify the default generated tags by adding a new one at the end of the file. Same for the components.

**_NOTE 1_**

Overriding the `full_documentation.json` is a bad idea since it will be regenerated each time you change a model.

**_NOTE 2_**

You can modify the `tags`, `paths`, and `components` keys on the generated documentation by providing replacement values. You can see how the API is used in the users-permissions plugin: `packages/plugins/users-permissions/server/register.js`

### FAQ

#### How does it generate the others plugins documentation ?

In other to reference a plugin's route into the documentation you need to add a `description` key in the `config` object.

For example this is the plugin email routes.json file

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
When we can't know by the controller name the type of the returned response (like `find` and `findOne`) you can specify it with this key. There's an example in `./plugins/users-permissions/config/routes.json`.

#### I have created a route in a common API (like product) that query another model. How to automate this ?

You can use the `tag` key in your route. If you provide a `tag` which is a string like `"tag": "Product"` the algorithm will know that the end-point retrieves data from the **`Product`** table. Creating a tag object `{ "tag": { "name": "User", "plugin": "User-Permissions } }` will result in generating a response with the **`User`** model from the plugin users-permissions.

---

Each entry of the object is easily customisable take look at the users-permissions ones they are a good example on how to do it.
