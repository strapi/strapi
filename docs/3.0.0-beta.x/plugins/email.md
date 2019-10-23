# Email

Thanks to the plugin `Email`, you can send email from your server or externals providers such as **Sendgrid**.

## Programmatic usage

In your custom controllers or services you may want to send email.
By using the following function, strapi will use the configured provider to send an email.

```js
await strapi.plugins['email'].services.email.send({
  to: 'paulbocuse@strapi.io',
  from: 'joelrobuchon@strapi.io',
  replyTo: 'no-reply@strapi.io',
  subject: 'Use strapi email provider successfully',
  text: 'Hello world!',
  html: 'Hello world!',
});
```

## Configure the plugin

The plugin provide you a setting page to be able to define the email provider you want to use.
You will also be able to add some configuration.

- Click on **Plugins** in the left menu
- Click on the cog button on the **Email** plugin line

## Install new providers

By default Strapi provides a local email system. You might want to send email with a third party.

You can check all the available providers developed by the community on npmjs.org - [Providers list](https://www.npmjs.com/search?q=strapi-provider-email-)

To install a new provider run:

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "yarn"

```
yarn add strapi-provider-email-sendgrid@beta --save
```

:::

::: tab "npm"

```
npm install strapi-provider-email-sendgrid@beta --save
```

:::

::::

::: note
If the provider is not in the mono repo, you probably don't need `@beta` depending if the creator published it with this tag or not.
:::

Then, visit [http://localhost:1337/admin/plugins/email/configurations/development](http://localhost:1337/admin/plugins/email/configurations/development) on your web browser and configure the provider.

## Create new provider

If you want to create your own, make sure the name starts with `strapi-provider-email-` (duplicating an existing one will be easier), modify the `auth` config object and customize the `send` function.

Default template

```js
module.exports = {
  provider: 'provider-id',
  name: 'display name',
  auth: {
    config_1: {
      label: 'My Config 1',
      type: 'text',
    },
  },
  init: config => {
    return {
      send: async options => {},
    };
  },
};
```

In the `send` function you will have access to:

- `config` that contain configuration you setup in your admin panel
- `options` that contain option your send when you called the `send` function from the email plugin service

To use it you will have to publish it on **npm**.

### Create a local provider

If you want create your own provider without publishing it on **npm** you can follow these following steps:

- You create a `providers` folder in your application.
- Create your provider as explain in the documentation eg. `./providers/strapi-provider-email-[...]/...`
- Then update your `package.json` to link your `strapi-provider-email-[...]` dependency to the [local path](https://docs.npmjs.com/files/package.json#local-paths) of your new provider.

```json
{
  ...
  "dependencies": {
    ...
    "strapi-provider-email-[...]": "file:providers/strapi-provider-email-[...]",
    ...
  }
}
```

- Finally, run `yarn install` or `npm install` to install your new custom provider.
