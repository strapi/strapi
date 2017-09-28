# strapi-ejs

[![npm version](https://img.shields.io/npm/v/strapi-ejs.svg)](https://www.npmjs.org/package/strapi-ejs)
[![npm downloads](https://img.shields.io/npm/dm/strapi-ejs.svg)](https://www.npmjs.org/package/strapi-ejs)
[![npm dependencies](https://david-dm.org/strapi/strapi-ejs.svg)](https://david-dm.org/strapi/strapi-ejs)
[![Build status](https://travis-ci.org/strapi/strapi-ejs.svg?branch=master)](https://travis-ci.org/strapi/strapi)
[![Slack status](http://strapi-slack.herokuapp.com/badge.svg)](http://slack.strapi.io)

This built-in hook allows you to use the EJS template engine with custom options.

# How To use

To configure your hook with custom options, you need to edit your `./config/hooks.json` file in your Strapi app.
```javascript
{
  hooks: {
    ...
    websockets: true,
    ejs: {
      layout: layout, // Global layout file (default: layout)(set false to disable layout)
      viewExt: ejs, // View file extension (default: ejs)
      cache: true, // Cache compiled templates (default: true).
      debug: true // Debug flag (default: false)
    }
    ...
  }
}
```

## Resources

- [MIT License](LICENSE.md)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
