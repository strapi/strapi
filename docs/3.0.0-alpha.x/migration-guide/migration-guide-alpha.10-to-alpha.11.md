# Migration guide from alpha.10 to alpha.11

**Here are the major changes:**

- Add plugin upload

<br>

::: note
Feel free to [join us on Slack](http://slack.strapi.io) and ask questions about the migration process.
:::


<br>

## Getting started

Install Strapi `alpha.11.1` globally on your computer. To do so run `npm install strapi@3.0.0-alpha.11.1 -g`.

When it's done, generate a new empty project `strapi new myNewProject` (don't pay attention to the database configuration).

<br>

## Configurations

You will have to update just 1 file: `package.json`

- Edit the Strapi's dependencies version: (move Strapi's dependencies to `3.0.0-alpha.11.1` version) in `package.json` file

```json
{
  "dependencies": {
    "lodash": "4.x.x",
    "strapi": "3.0.0-alpha.11.1",
    "strapi-mongoose": "3.0.0-alpha.11.1"
  }
}
```

<br>

## Update the Admin

Delete your old admin folder and replace it by the new one.

<br>

## Update the Plugins

Copy this file `/plugins/users-permissions/config/jwt.json` **from your old project** and paste it in the corresponding one in your new project.

Copy the fields and relations you had in your `/plugins/users-permissions/models/User.settings.json` and `/plugins/users-permissions/config/jwt.json` file in the new one.

Then, delete your old `plugins` folder and replace it by the new one.

<br>

## Update the Dependencies

Now let's update the dependencies in your `package.json` we edited earlier. Simply run `npm install`:

That's all, you have now upgraded to Strapi `alpha.11`.
