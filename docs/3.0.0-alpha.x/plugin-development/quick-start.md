# Quick start

To facilitate the development of a plugin, we drastically reduce the amount of commands necessary to install the entire development environment. Before getting started, you need to have Node.js (v8)  and npm (v5) installed.

## Development Environment Setup

To setup the development environment please **follow the instructions below:**

1. [Fork the repository](https://github.com/strapi/strapi) to your own GitHub account.
2. Clone it to your computer `git clone git@github.com:strapi/strapi.git`. (or your fork)
3. Run `cd strapi && npm run setup`

You can run `npm run setup:build` to build the plugins' admin (the setup time will be longer)

Create a development project

1. Create a new project `cd .. && strapi new myDevelopmentProject --dev`.
2. `cd myDevelopmentProject && strapi start` To start the strapi project

::: note
If the installation failed, please remove the global packages related to Strapi. The command `npm ls strapi` will help you to find where your packages are installed globally.
:::

## Plugin development Setup

In a new terminal window:

1. Generate a new plugin: `cd /path/to/myDevelopmentProject && strapi generate:plugin my-plugin`
2. Install admin dependencies and build: `cd /admin && npm run setup`
3. `npm start`

When finished with plugin modifications:

1. `cd /path/to/myDevelopmentProject && npm run setup ---plugins`

To rebuild plugins:

Run this inside the cloned or forked repo of `strapi`
1. `cd strapi && npm run setup:build`


Your are now ready to develop your own plugin and live-test your updates! The working local URI should be localhost:4000/admin.
