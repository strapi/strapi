# Strapi plugin

After you need to set the provider values in the admin panel, you can override the srapi provided value using the following method.

Create a file `provider.js` on the `./config` folder

```
module.exports = ({ env }) => ({
    github:{
        redirect_url:env('GITHUB_CALLBACK_HOST', ''),
        client_secret:env('GITHUB_CLIENT_SECRET', ''),
        client_id:env('GITHUB_CLIENT_ID', ''),
    },
    facebook:{
        ...
    },
    ...
  });

```

Update the redirect url to the one you want strapi to really use.
In this example, you can even override the client secret/id
