## Removing CSS modules

To remove this feature from your setup, stop importing `.css` files in your
components and delete the `modules` option from the `css-loader` declaration in
[`webpack.prod.babel.js`](/internals/webpack/webpack.prod.babel.js) and
[`webpack.base.babel.js`](/internals/webpack/webpack.base.babel.js)!

## Removing PostCSS

To remove PostCSS, delete the `postcssPlugins` option and remove all occurences
of the `postcss-loader` from

- [`webpack.dev.babel.js`](/internals/webpack/webpack.dev.babel.js)
- [`webpack.prod.babel.js`](/internals/webpack/webpack.prod.babel.js)
- [`webpack.base.babel.js`](/internals/webpack/webpack.base.babel.js)

When that is done - and you've verified that everything is still working - remove
all related dependencies from [`package.json`](/package.json)!

## Removing `sanitize.css`

Delete [lines 44 and 45 in `app.js`](../../app/app.js#L44-L45) and remove it
from the `dependencies` in [`package.json`](../../package.json)!
