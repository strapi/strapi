---
title: Enter the REPL
---

## Start the REPL

Now that the `car` API is generated and the database upgraded thanks to a migration, you are ready to access your API.

Let's start your application with an opened REPL:

```bash
$ strapi console
```

This let you start your application, and enter the [Node.js REPL](https://nodejs.org/api/repl.html). This means you can access and use all of your models, services, configuration, and much more. Useful for trying out queries, quickly managing your data, and checking out your project's runtime configuration.

## Access global objects

You can access the Strapi global object with `strapi`. Your generated `car` API is accessible at `strapi.api.car`. If you want to output the `car` API object it should look like this:

```bash
> strapi.api.car
```

If you need to take a look at your current used config, simply run:

```bash
> strapi.config
```
