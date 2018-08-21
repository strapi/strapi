# strapi-hook-ejs

[![npm version](https://img.shields.io/npm/v/strapi-ejs.svg)](https://www.npmjs.org/package/strapi-ejs)
[![npm downloads](https://img.shields.io/npm/dm/strapi-ejs.svg)](https://www.npmjs.org/package/strapi-ejs)
[![npm dependencies](https://david-dm.org/strapi/strapi-ejs.svg)](https://david-dm.org/strapi/strapi-ejs)
[![Build status](https://travis-ci.org/strapi/strapi-ejs.svg?branch=master)](https://travis-ci.org/strapi/strapi)
[![Slack status](http://strapi-slack.herokuapp.com/badge.svg)](http://slack.strapi.io)

This built-in hook allows you to use the EJS template engine with custom options.

## Configuration

To configure your hook with custom options, you need to edit your `./config/hooks.json` file in your Strapi app.
```javascript
{
  ...
  "ejs": {
    "enabled": true,
    "layout": "layout",
    "viewExt": "ejs",
    "partial": true,
    "cache": false,
    "debug": true
  }
}
```
More information in the Koa ejs module https://github.com/koajs/ejs#settings

## Usage

Insert code in your controller to render a view.

```javascript
module.exports = {
  home: async (ctx) => {
    return ctx.render('home', {
      title: 'My app title'
    });
  }
};
```

This will render the `views/home.ejs` file and you will have access to `<%= title %>` data in your ejs file.


## Resources

- [MIT License](LICENSE.md)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
