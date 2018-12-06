# Plugin documentation

This plugin automates your API documentation creation. It basically generates a swagger file. It follows the [Open API specification version 3.0.1](https://swagger.io/specification/).
The documentation plugin is not release on npm yet, Here's how to install it.

## Installation (temporary)

**In your existing app**

- copy paste the documentation plugin into `my-app/plugins`

*NOTE: you should shut down your server while installing it...*

### Configuring the email plugin

**Path** `my-app/plugins/email`

- copy-paste the `documentation/overrides/1.0.0` files from the GitHub monorepo here's the [link](https://github.com/strapi/strapi/tree/add-description-to-plugins-routes/packages/strapi- plugin-email/documentation/overrides/1.0.0) into the `my-app/plugins/email/documentation/overrides/1.0.0`
- If you didn't add routes into the plugin copy paste the following into `my-app/plugins/email/config/routes`.

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

### Configuring the upload plugin

- **Path** `my-app/plugins/upload`

- copy-paste the `documentation/overrides/1.0.0` files from the GitHub monorepo here's the [link](https://github.com/strapi/strapi/tree/add-description-to-plugins-routes/packages/strapi- plugin-upload/documentation/overrides/1.0.0) into the `my-app/plugins/upload/documentation/overrides/1.0.0`
- If you didn't add routes into the plugin copy paste the following into `my-app/plugins/upload/config/routes`.

```
{
  "routes": [
    {
      "method": "POST",
      "path": "/",
      "handler": "Upload.upload",
      "config": {
        "policies": [],
        "description": "Upload a file",
        "tag": {
          "plugin": "upload",
          "name": "File"
        }
      }
    },
    {
      "method": "GET",
      "path": "/environments",
      "handler": "Upload.getEnvironments",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/settings/:environment",
      "handler": "Upload.getSettings",
      "config": {
        "policies": []
      }
    },
    {
      "method": "PUT",
      "path": "/settings/:environment",
      "handler": "Upload.updateSettings",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/files/count",
      "handler": "Upload.count",
      "config": {
        "policies": [],
        "description": "Retrieve the total number of uploaded files",
        "tag": {
          "plugin": "upload",
          "name": "File"
        }
      }
    },
    {
      "method": "GET",
      "path": "/files",
      "handler": "Upload.find",
      "config": {
        "policies": [],
        "description": "Retrieve all file documents",
        "tag": {
          "plugin": "upload",
          "name": "File"
        }
      }
    },
    {
      "method": "GET",
      "path": "/files/:_id",
      "handler": "Upload.findOne",
      "config": {
        "policies": [],
        "description": "Retrieve a single file depending on its id",
        "tag": {
          "plugin": "upload",
          "name": "File"
        }
      }
    },
    {
      "method": "GET",
      "path": "/search/:id",
      "handler": "Upload.search",
      "config": {
        "policies": [],
        "description": "Search for an uploaded file",
        "tag": {
          "plugin": "upload",
          "name": "File"
        }
      }
    },
    {
      "method": "DELETE",
      "path": "/files/:_id",
      "handler": "Upload.destroy",
      "config": {
        "policies": [],
        "description": "Delete an uploaded file",
        "tag": {
          "plugin": "upload",
          "name": "File"
        }
      }
    }
  ]
}
```

### Configuring the users-permissions plugin

- **Path** `my-app/plugins/users-permissions`

- copy-paste the `documentation/overrides/1.0.0` files from the GitHub monorepo here's the [link](https://github.com/strapi/strapi/tree/add-description-to-plugins-routes/packages/strapi- plugin-users-permissions/documentation/overrides/1.0.0) into the `my-app/plugins/users-permissions/documentation/overrides/1.0.0`
- If you didn't add routes into the plugin copy paste the following into `my-app/plugins/users-permissions/config/routes`.

```
{
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "handler": "UsersPermissions.index",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/init",
      "handler": "UsersPermissions.init",
      "config": {
        "policies": [],
        "description": "Check if the first admin user has already been registered",
        "tag": {
          "plugin": "users-permissions",
          "name": "Role"
        }
      }
    },
    {
      "method": "GET",
      "path": "/search/:id",
      "handler": "UsersPermissions.searchUsers",
      "config": {
        "policies": [],
        "description": "Search for users",
        "tag": {
          "plugin": "users-permissions",
          "name": "User",
          "actionType": "find"
        }
      }
    },
    {
      "method": "GET",
      "path": "/policies",
      "handler": "UsersPermissions.getPolicies",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/roles/:id",
      "handler": "UsersPermissions.getRole",
      "config": {
        "policies": [],
        "description": "Retrieve a role depending on its id",
        "tag": {
          "plugin": "users-permissions",
          "name": "Role",
          "actionType": "findOne"
        }
      }
    },
    {
      "method": "GET",
      "path": "/roles",
      "handler": "UsersPermissions.getRoles",
      "config": {
        "policies": [],
        "description": "Retrieve all role documents",
        "tag": {
          "plugin": "users-permissions",
          "name": "Role",
          "actionType": "find"
        }
      }
    },
    {
      "method": "GET",
      "path": "/routes",
      "handler": "UsersPermissions.getRoutes",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/email-templates",
      "handler": "UsersPermissions.getEmailTemplate",
      "config": {
        "policies": []
      }
    },
    {
      "method": "PUT",
      "path": "/email-templates",
      "handler": "UsersPermissions.updateEmailTemplate",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/advanced",
      "handler": "UsersPermissions.getAdvancedSettings",
      "config": {
        "policies": []
      }
    },
    {
      "method": "PUT",
      "path": "/advanced",
      "handler": "UsersPermissions.updateAdvancedSettings",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/providers",
      "handler": "UsersPermissions.getProviders",
      "config": {
        "policies": []
      }
    },

    {
      "method": "PUT",
      "path": "/providers",
      "handler": "UsersPermissions.updateProviders",
      "config": {
        "policies": []
      }
    },
    {
      "method": "POST",
      "path": "/roles",
      "handler": "UsersPermissions.createRole",
      "config": {
        "policies": [],
        "description": "Create a new role",
        "tag": {
          "plugin": "users-permissions",
          "name": "Role",
          "actionType": "create"
        }
      }
    },
    {
      "method": "PUT",
      "path": "/roles/:role",
      "handler": "UsersPermissions.updateRole",
      "config": {
        "policies": [],
        "description": "Update a role",
        "tag": {
          "plugin": "users-permissions",
          "name": "Role",
          "actionType": "update"
        }
      }
    },
    {
      "method": "DELETE",
      "path": "/roles/:role",
      "handler": "UsersPermissions.deleteRole",
      "config": {
        "policies": [],
        "description": "Delete a role",
        "tag": {
          "plugin": "users-permissions",
          "name": "Role",
          "actionType": "destroy"
        }
      }
    },
    {
      "method": "DELETE",
      "path": "/providers/:provider",
      "handler": "UsersPermissions.deleteProvider",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/connect/*",
      "handler": "Auth.connect",
      "config": {
        "policies": ["plugins.users-permissions.ratelimit"],
        "prefix": "",
        "description": "Connect a provider",
        "tag": {
          "plugin": "users-permissions",
          "name": "User"
        }
      }
    },
    {
      "method": "POST",
      "path": "/auth/local",
      "handler": "Auth.callback",
      "config": {
        "policies": ["plugins.users-permissions.ratelimit"],
        "prefix": "",
        "description": "Login a user using the identifiers email and password",
        "tag": {
          "plugin": "users-permissions",
          "name": "User"
        }
      }
    },
    {
      "method": "POST",
      "path": "/auth/local/register",
      "handler": "Auth.register",
      "config": {
        "policies": ["plugins.users-permissions.ratelimit"],
        "prefix": "",
        "description": "Register a new user with the default role",
        "tag": {
          "plugin": "users-permissions",
          "name": "User",
          "actionType": "create"
        }
      }
    },
    {
      "method": "GET",
      "path": "/auth/:provider/callback",
      "handler": "Auth.callback",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Successfull redirection after approving a provider",
        "tag": {
          "plugin": "users-permissions",
          "name": "User"
        }
      }
    },
    {
      "method": "POST",
      "path": "/auth/forgot-password",
      "handler": "Auth.forgotPassword",
      "config": {
        "policies": ["plugins.users-permissions.ratelimit"],
        "prefix": "",
        "description": "Send the reset password email link",
        "tag": {
          "plugin": "users-permissions",
          "name": "User"
        }
      }
    },
    {
      "method": "POST",
      "path": "/auth/reset-password",
      "handler": "Auth.changePassword",
      "config": {
        "policies": ["plugins.users-permissions.ratelimit"],
        "prefix": "",
        "description": "Change a user's password",
        "tag": {
          "plugin": "users-permissions",
          "name": "User"
        }
      }
    },
    {
      "method": "GET",
      "path": "/auth/email-confirmation",
      "handler": "Auth.emailConfirmation",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Validate a user account",
        "tag": {
          "plugin": "users-permissions",
          "name": "User"
        }
      }
    },
    {
      "method": "GET",
      "path": "/users",
      "handler": "User.find",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Retrieve all user documents",
        "tag": {
          "plugin": "users-permissions",
          "name": "User",
          "actionType": "find"
        }
      }
    },
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
    },
    {
      "method": "GET",
      "path": "/users/:_id",
      "handler": "User.findOne",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Retrieve a single user depending on his id",
        "tag": {
          "plugin": "users-permissions",
          "name": "User",
          "actionType": "findOne"
        }
      }
    },
    {
      "method": "POST",
      "path": "/users",
      "handler": "User.create",
      "config": {
        "policies": [],
        "prefix": ""
      }
    },
    {
      "method": "PUT",
      "path": "/users/:_id",
      "handler": "User.update",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Update an existing user",
        "tag": {
          "plugin": "users-permissions",
          "name": "User",
          "actionType": "update"
        }
      }
    },
    {
      "method": "DELETE",
      "path": "/users/:_id",
      "handler": "User.destroy",
      "config": {
        "policies": [],
        "prefix": "",
        "description": "Delete an existing user",
        "tag": {
          "plugin": "users-permissions",
          "name": "User",
          "actionType": "destroy"
        }
      }
    }
  ]
}
```
---

At this point if you start your server the documentation will be generated for both your APIs and the plugins.


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

The plugin provides a `settings.json` located in `./config` where you can specify all your environment variables, licences, external documentation...
You can add all the entries listed in the [specification](https://swagger.io/specification/).

*NOTE* if you need to add a custom entry you can do it by prefixing your key by `x-{something}`

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
      - overrides
        - 1.0.0
- plugins
  - ...
  - documentation
    - documentation
      - 1.0.0
        - full_documentation.json

#### full_documentation.json

The combined documentation is merged into full_documentation.json it's located in `./plugins/documentation/{version}/full_documentation.json`

It has the following structure

```
{
  "openapi": "3.0.0" // do not change this version
  "info": {
    "version": "1.0.0" // change this line to create a new version
    ...
  }
  "x-strapi-config": {
     "path": "/documentation", // Change this line to change to url of the doc
    "showGeneratedFiles": true // Do not change this line at the moment...
  },
  "servers" {} // Your servers config (it will be automated),
  "externalDocs": {},
  "paths": {} // All your Api routes,
  "tags": [] // Group of route
  "components": {} // Default generated components and custom ones
}
```


### Overriding the suggested documentation

Currently the plugin write a json file for each API, there's an option that will prevent this generation (if you want to).

In order to customize the response or to add informations to a path you need to create a file in the associated `overrides/versionNumber.json` (the name of the file matters make sure they are similar). Then you just need to identify the path you want to modify.
You can modify the default generated tags by adding a new one at the end of the file. Same for the components.

***NOTE 1**

Overriding the `full_documentation.json` is a bad idea since it will be regenerated each time you change a model.

***NOTE 2***

You can easily modify the description, summary, parameters of a path however, for a response like the `200` you will need to write the full object. Take a look at the `./plugins/users-permissions/documentation/overrides/1.0.0/users-permissions-User.json` for a complete example.

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

In this file we have only one route that we want to reference in our documentation (`/`). Usually, the tag object is a UI things, it will group this route under the `Email - Email` dropdown in the documentation. Furthermore, the algorithm will try to find the model to generate the best response possible. If the model is unknown it generate a response like the following: 
```
{ foo: "string" }
```
that you can easily override later.

There's another property to guide the algorithm in created the best response possible the `actionType` key.
When we can't know by the controller name the type of the returned response (like `find` and `findOne`) you can specify it with this key. There's an example in `./plugins/users-permissions/config/routes.json`.


#### I have created a route into a common API (like product) that query another model. How to automate this ?

You can use the `tag` key in your route. If you provide a `tag` which is a string like `"tag": "Product"` the algorithm will know that the path retrieves data in the Product table. Creating a tag object `{ "tag": { "name": "User", "plugin": "User-Permissions } }` will result in the algorithm generating a response with the model User from the plugin users-permissions.


---
Each entry of the object is easily customisable take look at the users-permissions ones they are a good example on how to do it.

--- 

### TODO

- [ ] Disable the generated files in each API and plugins.