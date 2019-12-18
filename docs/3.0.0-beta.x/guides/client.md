# Setup a third party client

This guide will explain how to setup a connection with a tiers client and use it everywhere in your code.

In our example we will use the GitHub Node.JS client [OctoKit REST.js](https://github.com/octokit/rest.js/).

This guide could also be used to setup an Axios client instance.

## Installation

First you will have to install the client node_module in your application by running one of the following command.

:::: tabs

::: tab yarn
`yarn add @octokit/rest`
:::

::: tab npm
`npm install @octokit/rest`
:::

::::

## Create a hook

To init the client, we will use [Strapi hooks system](../concepts/hooks.md). Hooks let you add new features in your Strapi application.

Hooks are loaded one time, at the server start.

Lets create our GitHub hook.

**Path —** `./hooks/github/index.js`

```js
module.exports = strapi => {
  const hook = {
    initialize: async () => {
      console.log('my hook is loaded');
    },
  };

  return hook;
};
```

When the hook is created, we have to enable it to say to Strapi to use this hook.

**Path —** `./config/hook.json`

```json
{
  ...
  "github": {
    "enabled": true
  }
}
```

Now you can start your application, you should see a log `my hook is loaded` in your terminal.

## Initialize the client

First lets update the config file to add your [GitHub token](https://github.com/settings/tokens).
By following the [documentation](https://octokit.github.io/rest.js/#authentication) you will also find the way to use GitHub applications.

**Path —** `./config/hook.json`

```json
{
  ...
  "github": {
    "enabled": true,
    "token": "bf78d4fc3c1767019870476d6d7cc8961383d80f"
  }
}
```

Now we have to load the GitHub client.

**Path —** `./hooks/github/index.js`

```js
const GitHubAPI = require('@octokit/rest');

module.exports = strapi => {
  const hook = {
    initialize: async () => {
      const { token } = strapi.config.hook.github;

      strapi.github = new GitHubAPI({
        userAgent: `${strapi.config.info.name} v${strapi.config.info.version}`,
        auth: `token ${token}`,
      });
    },
  };

  return hook;
};
```

And here it is.

You can now use `strapi.github` everywhere in your code to use the GitHub client.

To simply test if it works, lets update the `bootstrap.js` function to log your GitHub profile.

**Path —** `./config/functions/bootstrap.js`

```js
module.exports = async () => {
  const data = await strapi.github.users.getAuthenticated();
  console.log(data);
};
```

Restart your server and you should see your GitHub profile data.

## Configs by environment

You would probably want specific configurations for development and production environment.

To do so, we will update some configurations.

You have to cut your `github` configs from `./config/hook.json` to set them in `./config/environments/development.json`.

And in your GitHub hook, you will have to replace `strapi.config.hook.github` by `strapi.config.currentEnvironment.github` to access to the configs.

**Path —** `./config/environments/development.json`

```json
{
  "github": {
    "enabled": true,
    "token": "806506ab855a94e8608148315eeb39a44c29aee1"
  }
}
```

**Path —** `./hooks/github/inde.js`

```js
const GitHubAPI = require('@octokit/rest');

module.exports = strapi => {
  const hook = {
    initialize: async () => {
      const { token } = strapi.config.currentEnvironment.github;

      strapi.github = new GitHubAPI({
        userAgent: `${strapi.config.info.name} v${strapi.config.info.version}`,
        auth: `token ${token}`,
      });
    },
  };

  return hook;
};
```
