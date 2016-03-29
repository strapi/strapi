---
title: Public assets
---

Strapi is compatible with any front-end strategy; whether it's Angular, Backbone, Ember, iOS, Android, Windows Phone, or something else that hasn't been invented yet.

## Configuration

Configuration:

- Key: `static`
- Environment: all
- Location: `./config/general.json`
- Type: `boolean`

Example:

```js
{
  "static": true
}
```

Notes:

- Set to `false` to disable the public assets.

## Usage

Public assets refer to static files on your server that you want to make accessible to the outside world. In Strapi, these files are placed in the `./public` directory.
