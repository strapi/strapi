# Templates

A template is a pre-made Strapi configuration designed for a specific use case. It allows you to quickly boostrap a custom Strapi app.

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
yarn create strapi-app my-project --template <template-github-url>
```

:::

::: tab npx

```bash
npx create-strapi-app my-project --template <template-github-url>
```

:::

::::

You can use the `--template` option in combination with all other `create-strapi-app` options, like `--quickstart` or `--no-run`.

## Creating a template

To create a Strapi template, you need to publish a public GitHub repository that follows some rules.

First, a template's only concern should be to adapt Strapi to a use case. It should not deal with environment-specific configs, like databases, or upload and email providers. This is to make sure that templates stay maintainable, and to avoid conflicts with other CLI options like `--quickstart`.

Second, a template must follow the following file structure. If any unexpected file or directory is found, the installation will crash.

### File structure

- `README.md`: to document your template
- `.gitignore`: to remove files from Git
- `template.json`: to extend the Strapi app's default `package.json`
- `/template`: where you can extend the file contents of a Strapi project. All the children are optional
  - `README.md`: the readme of an app made with this template
  - `.env.example`: to specify required environment variables
  - `api/`: for collections and single types
  - `components/` for components
  - `config/` can only include the `functions` directory (things like `bootstrap.js` or `404.js`), because other config files are environment-specific.
  - `data/` to store the data imported by a seed script
  - `plugins/` for custom Strapi plugins
  - `public/` to serve files
  - `scripts/` for custom scripts

### Step by step

After reading the above rules, follow these steps to create your template:

1. Create a standard Strapi app with `create-strapi-app`, using the `--quickstart` option.
2. Customize your app to match the needs of your use case.
3. Outside of Strapi, create a new directory for your template.
4. Create `template.json`, `.gitignore` and `README.md` files in your template directory.
5. If you have modified your app's `package.json`, include these changes (and _only_ these changes) in `template.json`. Otherwise, leave it as an empty object.
6. Create a `/template` subdirectory.
7. Think of all the files you have modified in your app, and copy them to the `/template` directory
8. Publish the root template project on GitHub. Make sure that the repository is public, and that the code is on the `master` branch.
