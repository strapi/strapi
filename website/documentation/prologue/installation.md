# Install Strapi

Before installing Strapi, make sure you have [installed Node.js](https://nodejs.org/en/download/package-manager/).

!!! important
    You need to make sure your machine meets the following requirements:

    - Node.js >= 4.0.0
    - npm >= 3.0.0

## Installation

To install the latest stable release with npm via the command-line tool:

```bash
$ npm install strapi-cli -g
```

Depending on the permissions on your machine you might need to run the installation as an administrator using `sudo`:

```bash
$ sudo npm install strapi-cli -g
```

## Verify the installation

Before creating a new project, let's verify the Strapi installation with:

```bash
$ strapi -v
2.0.0
```

If the command doesn't print a version but an error, the installation failed.

If you don't encounter any error you now are able to start using Strapi.

You can print out all `strapi` commands with:

```bash
$ strapi
```
