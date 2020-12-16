# Templates

A template is a pre-made Strapi configuration designed for a specific use case. It allows you to quickly bootstrap a custom Strapi app.

Here are some things a template may configure for you:

- Collection types and single types
- Components and dynamic zones
- Plugins to install, or custom plugins

::: warning
Templates and starters are not the same thing:

- A _template_ is a pre-made Strapi configuration. Note that it's only a configuration, not a configured application. That's because it cannot be run on its own, since it lacks many files, like database configs or the `package.json`. A template is only useful once applied on top of a default Strapi app via the CLI.
- A _starter_ is a pre-made frontend application that consumes a Strapi API

:::

## Using a template

You can use a template when creating a project with `create-strapi-app`.

:::: tabs

::: tab yarn

```bash
yarn create strapi-app my-project --template <template-github-name>
```

:::

::: tab npx

```bash
npx create-strapi-app my-project --template <template-github-name>
```

:::

::::

In these examples, the `template-github-name` argument can have different forms:

- A shorthand. If a Github user named `paul` has a repository called `strapi-template-restaurant`, then the shorthand would be `paul/restaurant`. It only works if the repository's name starts with `strapi-template-`.
- A URL. Just paste the URL of your GitHub repository. It works even if the repository is not prefixed by `strapi-template-`.

::: tip
When using a shorthand, if the username is omitted, the CLI assumes it's `strapi`.

So the following commands are equivalent:

```bash
# Shorthand
yarn create strapi-app my-project --template strapi/blog

# Shorthand with username omitted since it defaults to strapi
yarn create strapi-app my-project --template blog

# Full GitHub URL
yarn create strapi-app my-project --template https://github.com/strapi/strapi-template-blog
```

:::

You can use the `--template` option in combination with all other `create-strapi-app` options, like `--quickstart` or `--no-run`.

## Creating a template

To create a Strapi template, you need to publish a public GitHub repository that follows some rules.

First, a template's only concern should be to adapt Strapi to a use case. It should not deal with environment-specific configs, like databases, or upload and email providers. This is to make sure that templates stay maintainable, and to avoid conflicts with other CLI options like `--quickstart`.

Second, a template must follow the following file structure.

### File structure

You can add as many files as you want to the root of your template repository. But it must at least have `template` directory, and either a `template.json` or a `template.js` file.

The `template.json` is used to extend the Strapi app's default `package.json`. You can put all the properties that should overwrite the default `package.json` in a root `package` property. For example, a `template.json` might look like this:

```json
{
  "package": {
    "dependencies": {
      "strapi-plugin-graphql": "latest"
    },
    "scripts": {
      "custom": "node ./scripts/custom.js"
    }
  }
}
```

You can also use a `template.js` file instead of the `template.json` file. It should export a function that returns an object with the same properties. It's useful when our properties need to have dynamic values. For example, we can use it to make sure that a template requires the latest version of a Strapi plugin:

```js
module.exports = function(scope) {
  return {
    package: {
      dependencies: {
        'strapi-plugin-graphql': scope.strapiVersion,
      },
    },
  };
};
```

The `template` directory is where you can extend the file contents of a Strapi project. All the children are optional, you should only include the files that will overwrite the default Strapi app.

Only the following contents are allowed inside the `template` directory:

- `README.md`: the readme of an app made with this template
- `.env.example`: to specify required environment variables
- `api/`: for collections and single types
- `components/` for components
- `config/` can only include the `functions` directory (things like `bootstrap.js` or `404.js`), because other config files are environment-specific.
- `data/` to store the data imported by a seed script
- `plugins/` for custom Strapi plugins
- `public/` to serve files
- `scripts/` for custom scripts

If any unexpected file or directory is found, the installation will crash.

### Step by step

After reading the above rules, follow these steps to create your template:

1. Create a standard Strapi app with `create-strapi-app`, using the `--quickstart` option.
2. Customize your app to match the needs of your use case.
3. Outside of Strapi, create a new directory for your template.
4. Create a `template.json` file in your template directory.
5. If you have modified your app's `package.json`, include these changes (and _only_ these changes) in `template.json` in a `package` property. Otherwise, leave it as an empty object.
6. Create a `/template` subdirectory.
7. Think of all the files you have modified in your app, and copy them to the `/template` directory
8. Publish the root template project on GitHub. Make sure that the repository is public, and that the code is on the `master` branch.
