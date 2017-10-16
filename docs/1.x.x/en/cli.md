# CLI

Strapi comes with a convenient command-line tool to quickly get your application scaffolded and running.

## Login

```bash
$ strapi login
```

Ask your Strapi Studio credentials to link your new applications on your machine to
the Strapi Studio aiming to have a perfect workflow while you build APIs.

Go to [the Strapi Studio](http://studio.strapi.io/) to start the experience.

## Create a new project

```bash
$ strapi new <appName>
```

Create a new Strapi project in a directory called `appName`.

`$ strapi new` is really just a special generator which runs `strapi-generate-new`.
In other words, running `$ strapi new <appName>` is an alias for running
`$ strapi generate new <appName>`, and like any Strapi generator, the actual generator module
which gets run can be overridden.

## Start the server

```bash
$ cd <appName>
$ strapi start
```

Run the Strapi application in the current directory.
If `./node_modules/strapi` exists, it will be used instead of the globally installed module Strapi.

## Access the console

```bash
$ cd <appName>
$ strapi console
```

Start your Strapi application, and enter the Node.js REPL. This means you can access
and use all of your models, services, configuration, and much more. Useful for trying out
Waterline queries, quickly managing your data, and checking out your project's runtime configuration.

Note that this command still starts the server, so your routes will be accessible via HTTP and sockets.

Strapi exposes the same global variables in the console as it does in your application code.
This is particularly useful in the REPL. By default, you have access to the Strapi application
instance, your models as well as Lodash (`_`) and Socket.IO (`io`).

## Generate an API

```bash
$ strapi generate api <apiName>
```

Generate a complete API with controllers, models and routes.

## Print the Strapi version

```bash
$ strapi version
```

Output the current globally installed Strapi version.

## Link your application

```bash
$ strapi link
```

Link an existing application without an `appId` to the Strapi Studio.

This command can be useful if you were not logged into the Studio or if you
didn't have Internet access when you generated your application.

## Logout

```bash
$ strapi logout
```

If you don't want to be logged in to the Strapi Studio anymore.
