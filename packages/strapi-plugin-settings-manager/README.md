# Strapi Settings Manager

## Description

Strapi plugin built to let you easily configure your Strapi applications.

## Installation

Create a new Strapi application: `strapi new myApp`.

Go in your new Strapi application: `cd myApp`.

Go in the plugins repository: `cd plugins`.

Clone this repository: `git clone https://github.com/strapi/strapi-settings-manager settings-manager`.

Go in the Settings Manager repository: `cd settings-manager`.

Setup the plugin: `npm run setup`. This will install the required node modules and build the React plugin.

Go at the root of your application: `cd ../..`.

Start your application: `strapi start`.

Summary:
```
strapi new myApp \
  && cd myApp \
  && cd plugins \
  && git clone https://github.com/strapi/strapi-settings-manager settings-manager \
  && cd settings-manager \
  && npm run setup \
  && cd ../.. \
  && strapi start
```

Note: in the near future, the way to install the plugins will be easier (eg. `strapi install settings-manager`).
