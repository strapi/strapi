# Introduction

The JavaScript ecosystem evolves at incredible speed: staying current can feel
overwhelming. So, instead of you having to stay on top of every new tool,
feature and technique to hit the headlines, this project aims to lighten the
load by providing a curated baseline of the most valuable ones.

Using React Boilerplate, you get to start your app with our community's current
ideas on what represents optimal developer experience, best practice, most
efficient tooling and cleanest project structure.

- [**CLI Commands**](commands.md)
- [Tool Configuration](files.md)
- [Server Configurations](server-configs.md)
- [Deployment](deployment.md) *(currently Heroku specific)*
- [FAQ](faq.md)
- [Gotchas](gotchas.md)

# Feature overview

## Quick scaffolding

Automate the creation of components, containers, routes, selectors and sagas -
and their tests - right from the CLI!

Run `npm run generate` in your terminal and choose one of the parts you want
to generate. They'll automatically be imported in the correct places and have
everything set up correctly.

> We use [plop] to generate new components, you can find all the logic and
templates for the generation in `internals/generators`.

[plop]: https://github.com/amwmedia/plop

## Instant feedback

Enjoy the best DX and code your app at the speed of thought! Your saved changes
to the CSS and JS are reflected instantaneously without refreshing the page.
Preserve application state even when you update something in the underlying code!

## Predictable state management

We use Redux to manage our applications state. We have also added optional
support for the [Chrome Redux DevTools Extension] – if you have it installed,
you can see, play back and change your action history!

[Chrome Redux DevTools Extension]: https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd

## Next generation JavaScript

Use ESNext template strings, object destructuring, arrow functions, JSX syntax
and more, today. This is possible thanks to Babel with the `es2015`, `stage-0`
and `react` presets!

## Next generation CSS

Write composable CSS that's co-located with your components using [CSS modules]
for complete modularity. Unique generated class names keep the specificity low
while eliminating style clashes. Ship only the styles that are used on the
visible page for the best performance.

[CSS modules]: ../css/css-modules.md

## Industry-standard routing

It's natural to want to add pages (e.g. `/about`) to your application, and
routing makes this possible. Thanks to [react-router] with [react-router-redux],
that's as easy as pie and the url is auto-synced to your application state!

[react-router]: https://github.com/reactjs/react-router
[react-router-redux]: https://github.com/reactjs/react-router-redux

# Optional extras

_Don't like any of these features? [Click here](remove.md)_

## Offline-first

The next frontier in performant web apps: availability without a network
connection from the instant your users load the app. This is done with a
ServiceWorker and a fallback to AppCache, so this feature even works on older
browsers!

> All your files are included automatically. No manual intervention needed
thanks to Webpack's [`offline-plugin`](https://github.com/NekR/offline-plugin)

### Add To Homescreen

After repeat visits to your site, users will get a prompt to add your application
to their homescreen. Combined with offline caching, this means your web app can
be used exactly like a native application (without the limitations of an app store).

The name and icon to be displayed are set in the `app/manifest.json` file.
Change them to your project name and icon, and try it!

## Performant Web Font Loading

If you simply use web fonts in your project, the page will stay blank until
these fonts are downloaded. That means a lot of waiting time in which users
could already read the content.

[FontFaceObserver](https://github.com/bramstein/fontfaceobserver) adds a class
to the `body` when the fonts have loaded. (see [`app.js`](../../app/app.js#L26-L36)
and [`App/styles.css`](../../app/containers/App/styles.css))

### Adding a new font

1. Either add the `@font-face` declaration to `App/styles.css` or add a `<link>`
tag to the [`index.html`](../../app/index.html). (Don't forget to remove the `<link>`
for Open Sans from the [`index.html`](../../app/index.html)!)

2. In `App/styles.css`, specify your initial `font-family` in the `body` tag
with only web-save fonts. In the `body.jsFontLoaded` tag, specify your
`font-family` stack with your web font.

3. In `app.js` add a `<fontName>Observer` for your font.

## Image optimization

Images often represent the majority of bytes downloaded on a web page, so image
optimization can often be a notable performance improvement. Thanks to Webpack's
[`image-loader`](https://github.com/tcoopman/image-webpack-loader), every PNG, JPEG, GIF and SVG images
is optimized.

See [`image-loader`](https://github.com/tcoopman/image-webpack-loader) to customize optimizations options.
