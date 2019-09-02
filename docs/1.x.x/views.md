# Views

In Strapi, views are markup templates that are compiled on the server into HTML pages.
In most cases, views are used as the response to an incoming HTTP request.

By default, Strapi doesn't use views. The philosophy of the framework is to
separate the reusable backend application logic from the frontend.

If you want to activate views, set the `views` in `./config/general.json`.

For example, if you want to use `lodash` for `.html` files and use it by default,
you may set up your `views` object as below:

```js
{
  "views": {
    "map": {
      "html": "lodash"
    },
    "default": "html"
  }
}
```

Views are defined in your application's `./views` directory.

## Render a view

Simply use `this.render` instead of `this.body` to render a view.

You don't need to specify the view extension if you use the default one sets in config.

Using the config we wrote above with `lodash` for `.html` files and use the `html`
extension by default, this example will render `./views/user.html` with
Lodash as template engine.

```js
yield this.render('user', {
  firstname: 'John',
  lastname: 'Doe'
});
```

```html
<html>
  <head>...</head>
  <body>
    <p>Firstname: <% firstname %><br>Lastname: <% lastname %></p>
  </body>
</html>
```

Here is the same example with the `jade` extension, not used by default:

```js
yield this.render('user.jade', {
  firstname: 'John',
  lastname: 'Doe'
});
```

## Supported template engines

To use a view engine, you should use npm to install it in your project and
set the `map` object in `strapi.config.views`. For example, if you want to use
`swig` for `.html` files and `hogan` for `.md` files, you may configure the
`map` object as below:

```js
{
  "views": {
    "map": {
      "html": "swig",
      "md": "hogan"
    }
  }
}
```

Strapi supports all of those view engines:

- [atpl](https://github.com/soywiz/atpl.js)
- [doT.js](https://github.com/olado/doT)
- [dust (unmaintained)](https://github.com/akdubya/dustjs)
- [dustjs-linkedin (maintained fork of dust)](https://github.com/linkedin/dustjs)
- [eco](https://github.com/sstephenson/eco)
- [ect](https://github.com/baryshev/ect)
- [ejs](https://github.com/visionmedia/ejs)
- [haml](https://github.com/visionmedia/haml.js)
- [haml-coffee](https://github.com/9elements/haml-coffee)
- [hamlet](https://github.com/gregwebs/hamlet.js)
- [handlebars](https://github.com/wycats/handlebars.js/)
- [hogan](https://github.com/twitter/hogan.js)
- [htmling](https://github.com/codemix/htmling)
- [jade](https://github.com/visionmedia/jade)
- [jazz](https://github.com/shinetech/jazz)
- [jqtpl](https://github.com/kof/node-jqtpl)
- [JUST](https://github.com/baryshev/just)
- [liquor](https://github.com/chjj/liquor)
- [lodash](https://github.com/bestiejs/lodash)
- [mote](https://github.com/satchmorun/mote)
- [mustache](https://github.com/janl/mustache.js)
- [nunjucks](https://github.com/mozilla/nunjucks)
- [QEJS](https://github.com/jepso/QEJS)
- [ractive](https://github.com/Rich-Harris/Ractive)
- [react](https://github.com/facebook/react)
- [swig](https://github.com/paularmstrong/swig)
- [templayed](http://archan937.github.com/templayed.js/)
- [liquid](https://github.com/leizongmin/tinyliquid)
- [toffee](https://github.com/malgorithms/toffee)
- [underscore](https://github.com/documentcloud/underscore)
- [walrus](https://github.com/jeremyruppel/walrus)
- [whiskers](https://github.com/gsf/whiskers.js)
