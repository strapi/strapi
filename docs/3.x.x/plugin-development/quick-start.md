# Quick start

To facilitate the development of a plugin, we drastically reduce the amount of commands necessary to install the entire development environment. Before getting started, you need to have Node.js (v8)  and npm (v5) installed.

## Development Environment Setup

To setup the development environment please **follow the instructions below:**

1. [Fork the repository](https://github.com/strapi/strapi) to your own GitHub account.
2. Clone it to your computer `git clone git@github.com:strapi/strapi.git`.
3. Run `npm run setup` at the root of the directory.

> You can run `npm run setup:build` to build the plugins' admin (the setup time will be longer)

> Note: If the installation failed, please remove the global packages related to Strapi. The command `npm ls strapi` will help you to find where your packages are installed globally.

## Plugin development Setup

Create a development project

1. Go to a folder on your computer `cd /path/to/my/folder`.
2. Create a new project `strapi new myDevelopmentProject --dev`.

To generate a new plugin **run the following commands:**
1. In your project folder `cd myDevelopmentProject && strapi generate:plugin my-plugin`.
2. Link the `strapi-helper-plugin` dependency in your project folder `cd pathToMyProject/myDevelopmentProject/plugins/my-plugin && npm link strapi-helper-plugin`.
3. Link the `strapi-helper-plugin` dependency in the `analytics` plugin folder `cd pathToMyProject/myDevelopmentProject/plugins/analytics && npm link strapi-helper-plugin`.
4. Start the server in the admin folder `cd pathToMyProject/myDevelopmentProject/admin && npm start` and go to the following url [http://localhost:4000/admin](http://localhost:4000/admin).
5. In a new terminal window open at the root of your project launch your Strapi server `strapi start`.


Your are now ready to develop your own plugin and live-test your updates!
