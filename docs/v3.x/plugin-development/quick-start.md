# Quick start

Strapi allows you to create local plugins that will work exactly the same as external ones. All your local plugins will be located in the `./plugins` folder of your application.

## Development Environment Setup

Create a development project

1. Create a new project `cd .. && strapi new myDevelopmentProject`.
2. `cd myDevelopmentProject && strapi develop` To start the Strapi project

## Plugin development Setup

In a new terminal window:

1. Generate a new plugin: `cd /path/to/myDevelopmentProject && strapi generate:plugin my-plugin`

## Add packages to a local plugin

In a new terminal window:
`cd /plugins/my-plugin && yarn add packageName`

## Install packages from local plugins

This can be achieved by using [Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/), it helps you set up multiple packages in such a way that you only need to run `yarn install` once to install all packages in a single pass. To achieve this start using `yarn` instead of `npm`.

1. Add local plugins to the `./myDevelopmentProject/package.json`:

```
//...
  "private": true,
  "workspaces": [
    "plugins/*"
  ],
//...
```

Please note that `"private": true` property is mandatory when working with workspaces.

2. `yarn install` - it will install all your packages from `./plugins/{plugin-name}/package.json`. Also, it will create a symlink for your plugin inside the `node_modules`.
