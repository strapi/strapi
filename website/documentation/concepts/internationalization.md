# Internationalization

If your application will touch people or systems from all over the world, internationalization and localization (`i18n`) may be an important part of your international strategy.

Strapi provides built-in support for detecting user language preferences and translating static words/sentences.

## Configuration

Configuration:

- Key: `i18n`
- Environment: all
- Location: `./config/i18n.json`
- Type: `object`

Example:

```js
{
  "i18n": {
    "defaultLocale": "en_US",
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
- `cookieName` (string): i18n cookies property, tries to find a cookie named `locale` here. Allows the locale to be set from query string or from cookie.

Notes:

- Set to `false` to disable the locales feature.
- Locales may be configured in the `./config/locales` directory.

## Locales

Strapi reads JSON-formatted translation files from your project's `./config/locales` directory. Each file corresponds with a locale (usually a language) that your backend will support. These files contain locale-specific strings (as JSON key-value pairs) that you can use in your views, controllers, etc.

When your server is in `production` mode it will read these files only once and then cache the result. It will not write any updated strings when in `production` mode.

Otherwise, the files will be read on every instantiation of the `i18n` object. Additionally newly-detected strings will be automatically added, and written out, to the locale JSON files.

These files contain locale-specific strings (as JSON key-value pairs) that you can use in your views, controllers, etc. Here is an example locale file (`./config/locales/fr_FR.json`):

```js
{
  "Hello!": "Bonjour!",
  "Hello %s, how are you today?": "Bonjour %s, comment allez-vous aujourd'hui ?"
}
```

!!! note
    The keys in your stringfiles are case sensitive and require exact matches. There are a few different schools of thought on the best approach here, and it really depends on who/how often you'll be editing the stringfiles in the future. Especially if you'll be editing the translations by hand, simpler, all-lowercase key names may be preferable for maintainability.

For example, here's another pass at `./config/locales/fr_FR.json`:

```js
{
  "hello": "Bonjour!",
  "hello-how-are-you-today": "Bonjour %s, comment allez-vous aujourd'hui ?"
}
```

And here's `./config/locales/en_US.json`:

```js
{
  "hello": "Hello!",
  "hello-how-are-you-today": "Hello %s, how are you today?"
}
```

You can also nest locale strings. But a better approach would be to use `.` to represent nested strings. For example, here's the list of labels for the index page of a user controller:

```js
{
  "user.index.label.id": "User ID",
  "user.index.label.name": "User Name"
}
```

## Usage

Locales are accessible from everywhere in your application.

```js
this.body = this.i18n.__('hello-how-are-you-today', 'John');
// => "Hello John, how are you today?"
```

Different plural forms are supported as a response to `count` with `this.i18n.__n(one, other, count)`.

Use `this.i18n.__n()` as you would use `this.i18.__()` directly:

```js
this.body = this.i18n.__n('%s cat', '%s cats', 1);
// => "1 cat"

this.body = this.i18n.__n('%s cat', '%s cats', 3);
// => "3 cats"
```

Or from locales:

```js
{
  "catEat": {
    "one": "%d cat eats the %s",
    "other": '%d cats eat the %s'
  }
}
```

```js
this.body = this.i18n.__n('catEat', 10, 'mouse');
// => "10 cats eat the mouse"
```
