# Configuration

While Strapi dutifully adheres to the philosophy of convention-over-configuration,
it is important to understand how to customize those handy defaults from time to time.
For almost every convention in Strapi, there is an accompanying set of configuration
options that allow you to adjust or override things to fit your needs.

Settings specified at the root directory will be available in all environments.

If you'd like to have some settings take effect only in certain environments,
you can use the special environment-specific files and folders.
Any files saved under the `./config/environments/development` directory will be
loaded only when Strapi is started in the `development` environment.

The built-in meaning of the settings in `strapi.config` are, in some cases,
only interpreted by Strapi during the `start` process. In other words, changing some
options at runtime will have no effect. To change the port your application is running on,
for instance, you can't just change `strapi.config.port`. You'll need to change or
override the setting in a configuration file or as a command-line argument,
then restart the server.

## Application package

`strapi.config` merge user config from the `./config` directory with the `package.json`
of the application.

The most important things in your `package.json` are the name and version fields.
Those are actually required, and your package won't install without them.
The name and version together form an identifier that is assumed to be completely unique.

### Application name

The name of the application.

- Key: `name`
- Environment: all
- Location: `./package.json`
- Type: `string`

Notes:
- The name must be shorter than 214 characters. This includes the scope for scoped packages.
- The name can't start with a dot or an underscore.
- New packages must not have uppercase letters in the name.
- The name ends up being part of a URL, an argument on the command line, and a folder name.
  Therefore, the name can't contain any non-URL-safe characters.
- Don't use the same name as a core Node.js module.
- Don't put "js" or "node" in the name. It's assumed that it's JavaScript, since you're writing
  a `package.json` file.
- The name will probably be passed as an argument to `require()`, so it should be something short,
  but also reasonably descriptive. You may want to check the npm registry to see if there's something
  by that name already, before you get too attached to it. https://www.npmjs.com/
- A name can be optionally prefixed by a scope, e.g. `@myorg/mypackage`.

### Application version

Changes to the package should come along with changes to the version.

- Key: `version`
- Environment: all
- Location: `./package.json`
- Type: `string`

Notes:
- Version must be parseable by `node-semver`, which is bundled with npm as a dependency.

### Application description

The description of your application helps people discover your package, as it's listed in `npm search`.

- Key: `description`
- Environment: all
- Location: `./package.json`
- Type: `string`

## Global settings

### Public assets

Public assets refer to static files on your server that you want to make accessible to the
outside world. In Strapi, these files are placed in the `./public` directory.

Strapi is compatible with any front-end strategy; whether it's Angular, Backbone, Ember,
iOS, Android, Windows Phone, or something else that hasn't been invented yet.

- Key: `static`
- Environment: all
- Location: `./config/general.json`
- Type: `boolean`
- Defaults to:

  ```js
  {
    "static": true
  }
  ```

Notes:
- Set to `false` to disable the public assets.

### Views

- Key: `views`
- Environment: all
- Location: `./config/general.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "views": false
  }
  ```

For more information, please refer to the [views documentation](http://strapi.io/documentation/views).

Options:
- `map`: Object mapping extension names to engine names.
- `default`: Default extension name to use when missing.
- `cache`: When `true` compiled template functions will be cached in-memory,
  this prevents subsequent disk I/O, as well as the additional compilation step
  that most template engines peform. By default this is enabled when the `NODE_ENV`
  environment variable is anything but `development`, such as `stage` or `production`.

Notes:
- Set to `false` to disable views support.

### WebSockets

Socket.IO enables real-time bidirectional event-based communication.
It works on every platform, browser or device, focusing equally on reliability
and speed.

By default Strapi binds Socket.IO and your common websockets features are
available using the `io` object.

- Key: `websockets`
- Environment: all
- Location: `./config/general.json`
- Type: `boolean`
- Defaults to:

  ```js
  {
    "websockets": true
  }
  ```

Notes:
- Set to `false` to disable websockets with Socket.IO.

### Favicon

Set a favicon for your web application.

- Key: `favicon`
- Environment: all
- Location: `./config/general.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "favicon": {
      "path": "favicon.ico",
      "maxAge": 86400000
    }
  }
  ```

Options:
- `path` (string): Relative path for the favicon to use from the application root directory.
- `maxAge` (integer): Cache-control max-age directive. Set to pass the cache-control in ms.

Notes:
- Set to `false` to disable the favicon feature.

### API prefix

Prefix your API aiming to not have any conflicts with your front-end if you have one of if need to
for some other reasons.

- Key: `prefix`
- Environment: all
- Location: `./config/general.json`
- Type: `string`
- Defaults to:

  ```js
  {
    "prefix": ""
  }
  ```

Notes:
- Let an empty string if you don't want to prefix your API.
- The prefix must starts with a `/`, e.g. `/api`.

### Blueprints

The blueprints are a set of useful actions containing all the logic you need to
create a clean RESTful API. The generated controllers and routes are automatically
plugged to the blueprint actions. Thanks to that, as soon as you generate a new API
from the CLI, you can enjoy a RESTful API without writing any line of code.

- Key: `blueprints`
- Environment: all
- Location: `./config/general.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "blueprints": {
      "defaultLimit": 30,
      "populate": true
    }
  }
  ```

Options:
- `defaultLimit` (integer): The maximum number of records to send back.
- `populate` (boolean): If enabled, the population process fills out attributes
  in the returned list of records according to the model's defined associations.

### i18n

If your application will touch people or systems from all over the world, internationalization
and localization (`i18n`) may be an important part of your international strategy.

Strapi provides built-in support for detecting user language preferences and translating
static words/sentences.

- Key: `i18n`
- Environment: all
- Location: `./config/i18n.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "i18n": {
      "defaultLocale": "en",
      "modes": [
        "query",
        "subdomain",
        "cookie",
        "header",
        "url",
        "tld"
      ],
      "cookieName": "locale"
    }
  }
  ```

Options:
- `defaultLocale` (string): The default locale to use.
- `modes` (array): Accept locale variable from:
  - `query`: detect query string with `/?locale=fr`
  - `subdomain`: detect subdomain with `fr.myapp.com`
  - `cookie`: detect cookie with `Accept-Language: en,fr;q=0.5`
  - `header`: detect header with `Cookie: locale=fr`
  - `url`: detect url with `/fr`
  - `tld`: detect TLD with `myapp.fr`
- `cookieName` (string): i18n cookies property, tries to find a cookie named `locale` here.
  Allows the locale to be set from query string or from cookie.

Notes:
- Set to `false` to disable the locales feature.
- Locales may be configured in the `./config/locales` directory.

### Global variables

For convenience, Strapi exposes a handful of global variables. By default, your application's
models, the global `strapi` object and the Lodash node module are all available on the global
scope; meaning you can refer to them by name anywhere in your backend code
(as long as Strapi has been loaded).

Nothing in Strapi core relies on these global variables. Each and every global exposed in
Strapi may be disabled in `strapi.config.globals`.

Bear in mind that none of the globals, including `strapi`, are accessible until after
Strapi has loaded. In other words, you won't be able to use `strapi.models.car` or `Car`
outside of a function (since Strapi will not have finished loading yet).

- Key: `globals`
- Environment: all
- Location: `./config/globals.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "globals": {
      "models": true,
      "strapi": true,
      "async": true,
      "_": true,
      "graphql": true
    }
  }
  ```

Options:
- `models` (boolean): Your application's models are exposed as global variables using their `globalId`.
  For instance, the model defined in the file `./api/car/models/Car.js` will be globally accessible as `Car`.
- `strapi` (boolean): In most cases, you will want to keep the `strapi` object globally accessible,
  it makes your application code much cleaner.
- `async` (boolean): Exposes an instance of Async.
- `_` (boolean): Exposes an instance of Lodash.
- `graphql` (boolean): Exposes an instance of GraphQL.

Notes:
- Set to `false` to disable global variables.

### Bootstrap function

The bootstrap function is a server-side JavaScript file that is executed by Strapi
just before your application is started.

This gives you an opportunity to set up your data model, run jobs, or perform some special logic.

- Key: `bootstrap`
- Environment: all
- Location: `./config/functions/bootstrap.js`
- Type: `function`

Notes:
- It's very important to trigger the callback method when you are finished with the bootstrap.
  Otherwise your server will never start, since it's waiting on the bootstrap.

### CRON tasks

CRON tasks allow you to schedule jobs (arbitrary functions) for execution at specific dates,
with optional recurrence rules. It only uses a single timer at any given time
(rather than reevaluating upcoming jobs every second/minute).

- Key: `cron`
- Environment: all
- Location: `./config/functions/cron.js`
- Type: `object`

  ```js
    module.exports.cron = {

      /**
       * Every day at midnight.
       */

      '0 0 * * *': function () {
        // Your code here
      }
    };
  }
  ```

Notes:
- The cron format consists of:
  1. second (0 - 59, optional)
  2. minute (0 - 59)
  3. hour (0 - 23)
  4. day of month (1 - 31)
  5. month (1 - 12)
  6. day of week (0 - 7)

### Studio connection

The Strapi Studio is a toolbox for developers that allows you to build and manage
your APIs in realtime without writing any line of code. When your application is
linked to the Studio, you are able to generate APIs from the Studio and see
the changes in realtime in your local application.

- Key: `studio`
- Environment: all
- Location: `./config/studio.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "studio": {
      "enabled": true,
      "secretKey": "YOUR SECRET KEY HERE"
    }
  }
  ```

Options:
- `enabled` (boolean): Do you want your application linked to the Strapi Studio?
- `secretKey` (string): The secret key of your application to link your
  current application with the Strapi Studio.

## General environment settings

### Host

The host name the connection was configured to.

- Key: `host`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `string`
- Defaults to:

  ```js
  {
    "host": "localhost"
  }
  ```

Notes:
- You don't need to specify a `host` in a `production` environment.
- Defaults to the operating system hostname when available, otherwise `localhost`.

### Port

The actual port assigned after the server has been started.

- Key: `port`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `integer`
- Defaults to:

  ```js
  {
    "port": 1337
  }
  ```

Notes:
- You don't need to specify a `host` in a `production` environment.
- When no port is configured or set, Strapi will look for the `process.env.PORT`
  value. If no port specified, the port will be `1337`.

### Front-end URL

This is the URL of your front-end application.

This config key is useful when you don't use the `./public` directory for your
assets or when you run your automation tools such as Gulp or Grunt on an other port.

This address can be resourceful when you need to redirect the user after he
logged in with an authentication provider.

- Key: `frontendUrl`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `string`
- Defaults to:

  ```js
  {
    "frontendUrl": ""
  }
  ```

### Reload

Enable or disable auto-reload when your application crashes.

- Key: `reload`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "reload": {
      "timeout": 1000,
      "workers": 1
    }
  }
  ```

Options:
- `timeout` (integer): Set the timeout before killing a worker in ms.
- `workers` (integer): Set the number of workers to spawn.
  If the `workers` key is not defined, Strapi will use every free CPU
  (recommended in `production` environment).

Notes:
- Set to `false` to disable the auto-reload and clustering features.

## Request

### Logger

Enable or disable request logs.

- Key: `logger`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `boolean`
- Defaults to:

  ```js
  {
    "logger": true
  }
  ```

Notes:
- Set to `false` to disable the logger.

### Body parser

Parse request bodies.

- Key: `parser`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "parser": {
      "encode": "utf-8",
      "formLimit": "56kb",
      "jsonLimit": "1mb",
      "strict": true,
      "extendTypes": {
        "json": [
          "application/x-javascript"
        ]
      }
    }
  }
  ```

Options:
- `encode` (string): Requested encoding.
- `formLimit` (string): Limit of the urlencoded body.
  If the body ends up being larger than this limit, a 413 error code is returned.
- `jsonLimit` (string): Limit of the JSON body.
- `strict` (boolean): When set to `true`, JSON parser will only accept arrays and objects.
- `extendTypes` (array): Support extend types.

Notes:
- Set to `false` to disable the body parser.

## Response

### Gzip

Enable or disable Gzip compression.

- Key: `gzip`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `boolean`
- Defaults to:

  ```js
  {
    "gzip": true
  }
  ```

Notes:
- Set to `false` to disable Gzip.

### Response time header

The `X-Response-Time` header records the response time for requests in HTTP servers.
The response time is defined here as the elapsed time from when a request enters the application
to when the headers are written out to the client.

- Key: `responseTime`
- Environment: `development`
- Location: `./config/environments/development/reponse.json`
- Type: `boolean`
- Defaults to:

  ```js
  {
    "responseTime": true
  }
  ```

Notes:
- Set to `false` to disable the response time header.

## Databases

Strapi comes installed with a powerful ORM/ODM called Waterline, a datastore-agnostic tool that
dramatically simplifies interaction with one or more databases.

It provides an abstraction layer on top of the underlying database, allowing you to easily query
and manipulate your data without writing vendor-specific integration code.

- Key: `orm`
- Environment: `development`
- Location: `./config/environments/development/databases.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "orm": {
      "adapters": {
        "disk": "sails-disk"
      },
      "defaultConnection": "default",
      "connections": {
        "default": {
          "adapter": "disk",
          "filePath": ".tmp/",
          "fileName": "default.db",
          "migrate": "alter"
        },
        "permanent": {
          "adapter": "disk",
          "filePath": "./data/",
          "fileName": "permanent.db",
          "migrate": "alter"
        }
      }
    }
  }
  ```

Options:
- `adapters` (object): Association between a connection and the adapter to use.
- `defaultConnection` (string): The default connection will be used if the
  `connection` key of a model is empty or missing.
- `connections` (object): Options of the connection.
  Every adapter has its own options such as `host`, `port`, `database`, etc.
  The `migrate` option controls how Strapi will attempt to automatically
  rebuild the tables/collections/sets/etc. in your schema.
  - `safe`: never auto-migrate database(s).
  - `alter`: auto-migrate database(s), but attempt to keep existing data.
  - `drop`: drop all data and rebuild models every time your application starts.

Notes:
- When your Strapi application starts, the Waterline ORM validates all of the data in your database.
  This `migrate` flag tells waterline what to do with data when the data is corrupt.
  You can set this flag to `safe` which will ignore the corrupt data and continue to start.
- By using `drop`, or even `alter`, you risk losing your data. Be careful.
  Never use `drop` or `alter` with a production dataset.
  Additionally, on large databases `alter` may take a long time to complete at startup.
  This may cause the start process to appear to hang.

## Security

### Sessions

Since HTTP driven applications are stateless, sessions provide a way to store information
about the user across requests.

Strapi provides "guest" sessions, meaning any visitor will have a session,
authenticated or not. If a session is new a `Set-Cookie` will be produced regardless
of populating the session.

Strapi only supports cookie sessions, for now.

- Key: `session`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "session": {
      "key": "myApp",
      "secretKeys": [
        "mySecretKey1"
      ],
      "maxAge": 86400000
    }
  }
  ```

Options:
- `key` (string): The cookie name.
- `secretKeys` (array): Keys used to encrypt the session cookie.
- `maxAge` (integer): Sets the time in seconds for when a cookie will be deleted.

Notes:
- Set to `false` to disable sessions.

### Cross Site Request Forgery (CSRF) headers

CSRF is a type of attack which forces an end user to execute unwanted actions on a web
application backend with which he/she is currently authenticated.

Strapi bundles optional CSRF protection out of the box.

- Key: `csrf`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "csrf": false
  }
  ```

Options:
- `key` (string): The name of the CSRF token added to the model.
  Defaults to `_csrf`.
- `secret` (string): The key to place on the session object which maps to the server side token.
  Defaults to `_csrfSecret`.

Notes:
- Set to `false` to disable CSRF headers.
- If you have existing code that communicates with your Strapi backend via `POST`, `PUT`, or `DELETE`
  requests, you'll need to acquire a CSRF token and include it as a parameter or header in those requests.

### Content Security Policy (CSP) headers

Content Security Policy (CSP) is a W3C specification for instructing the client browser as to
which location and/or which type of resources are allowed to be loaded.

This spec uses "directives" to define a loading behaviors for target resource types.
Directives can be specified using HTTP response headers or or HTML Meta tags.

- Key: `csp`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "csp": false
  }
  ```

Options:
- `policy` (object): Object definition of policy.
- `reportOnly` (boolean): Enable report only mode.
- `reportUri` (string): URI where to send the report data.

Notes:
- Set to `false` to disable CSP headers.

### X-Frame-Options headers

Enables `X-Frame-Options` headers to help prevent Clickjacking.

- Key: `xframe`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `string`
- Defaults to:

  ```js
  {
    "xframe": "SAMEORIGIN"
  }
  ```

Notes:
- The string is the value for the header: `DENY`, `SAMEORIGIN` or `ALLOW-FROM`.
- Set to `false` to disable X-Frame-Options headers.

### Platform for Privacy Preferences

Platform for Privacy Preferences (P3P) is a browser/web standard designed to facilitate
better consumer web privacy control. Currently out of all the major browsers, it is only
supported by Internet Explorer. It comes into play most often when dealing with legacy applications.

- Key: `p3p`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `string`
- Defaults to:

  ```js
  {
    "p3p": false
  }
  ```

Notes:
- The string is the value of the compact privacy policy.
- Set to `false` to disable P3P.

### HTTP Strict Transport Security

Enables HTTP Strict Transport Security for the host domain.

The preload flag is required for HSTS domain submissions to Chrome's HSTS preload list.

- Key: `hsts`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "hsts": {
      "maxAge": 31536000,
      "includeSubDomains": true
    }
  }
  ```

Options:
- `maxAge` (integer): Number of seconds HSTS is in effect.
- `includeSubDomains` (boolean): Applies HSTS to all subdomains of the host.

Notes:
- Set to `false` to disable HSTS.

### X-XSS-Protection headers

Cross-site scripting (XSS) is a type of attack in which a malicious agent manages to inject
client-side JavaScript into your website, so that it runs in the trusted environment of your users' browsers.

Enables `X-XSS-Protection` headers to help prevent cross site scripting (XSS) attacks in older IE browsers (IE8).

- Key: `xssProtection`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "xssProtection": false
  }
  ```

Options:
- `enabled` (boolean): If the header is enabled or not.
- `mode` (string): Mode to set on the header.

Notes:
- Set to `false` to disable HTTP Strict Transport Security.

### Cross-Origin Resource Sharing (CORS)

Cross-origin resource sharing (CORS) is a mechanism that allows restricted resources
(e.g. fonts, JavaScript, etc.) on a web page to be requested from another domain outside
the domain from which the resource originated.

- Key: `cors`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "cors": {
      "origin": true,
      "expose": [
        "WWW-Authenticate",
        "Server-Authorization"
      ],
      "maxAge": 31536000,
      "credentials": true,
      "methods": [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
        "HEAD"
      ],
      "headers": [
        "Content-Type",
        "Authorization"
      ]
    }
  }
  ```

Options:
- `origin` (string|boolean): Configures the `Access-Control-Allow-Origin` CORS header.
  Expects a string (ex: `http://example.com`) or a boolean.
  Set to `true` to reflect the request origin, as defined by `req.header('Origin')`.
  Set to `false` to disable CORS.
- `expose` (array): Configures the `Access-Control-Expose-Headers` CORS header.
  Set this to pass the header, otherwise it is omitted.
- `maxAge` (integer): Configures the `Access-Control-Max-Age` CORS header.
  Set to an integer to pass the header, otherwise it is omitted.
- `credentials` (boolean): Configures the `Access-Control-Allow-Credentials` CORS header.
  Set to `true` to pass the header, otherwise it is omitted.
- `methods` (array): Configures the `Access-Control-Allow-Methods` CORS header.
- `headers` (array): Configures the `Access-Control-Allow-Headers` CORS header.
  If not specified, defaults to reflecting the headers specified in the request's
  `Access-Control-Request-Headers` header.

Notes:
- Set to `false` to disable CORS.

### Secure Sockets Layer (SSL)

Secure Sockets Layer (SSL), is a cryptographic protocol designed to provide communications security
over a computer network.

This configuration enforce SSL for your application.

- Key: `ssl`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "ssl": false
  }
  ```

Options:
- `disabled` (boolean): If `true`, this middleware will allow all requests through.
- `trustProxy` (boolean): If `true`, trust the `X-Forwarded-Proto` header.

Notes:
- Set to `false` to disable SSL.

### IP filter

The IP filter configuration allows you to whitelist or blacklist specific or range IP addresses.

The blacklisted IP addresses won't have access to your web application at all.

- Key: `ip`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`
- Defaults to:

  ```js
  {
    "ip": {
      "whiteList": [],
      "blackList": []
    }
  }
  ```

Options:
- `whiteList` (array): IP addresses allowed.
- `blackList` (array): IP addresses forbidden.

Notes:
- Set to `false` to disable IP filter.

### Proxy

A proxy server is a server that acts as an intermediary for requests from clients
seeking resources from other servers.

Request your server, fetch the proxy URL you typed and return.

- Key: `proxy`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `string`
- Defaults to:

  ```js
  {
    "proxy": false
  }
  ```

Notes:
- The string will fetch the host and return.
- Set to `false` to disable the proxy security.
