### Removing offline access

**Careful** about removing this, as there is no real downside to having your
application available when the users network connection isn't perfect.

To remove offline capability, delete the `offline-plugin` from the
[`package.json`](../../package.json), remove the import of the plugin in
[`app.js`](../../app/app.js) and remove the plugin from the
[`webpack.prod.babel.js`](../../internals/webpack/webpack.prod.babel.js).

### Removing add to homescreen functionality

Delete [`manifest.json`](../../app/manifest.json) and remove the
`<link rel="manifest" href="manifest.json">` tag from the
[`index.html`](../../app/index.html).

### Removing performant web font loading

**Careful** about removing this, as perceived performance might be highly impacted.

To remove `FontFaceObserver`, don't import it in [`app.js`](../../app/app.js) and
remove it from the [`package.json`](../../package.json).

### Removing image optimization

To remove image optimization, delete the `image-webpack-loader` from the
[`package.json`](../../package.json), and remove the `image-loader` from [`webpack.base.babel.js`](../../internals/webpack/webpack.base.babel.js):
```
…
{
  test: /\.(jpg|png|gif)$/,
  loaders: [
    'file-loader',
    'image-webpack?{progressive:true, optimizationLevel: 7, interlaced: false, pngquant:{quality: "65-90", speed: 4}}',
  ],
}
…
```

Then replace it with classic `file-loader`:

```
…
{
  test: /\.(jpg|png|gif)$/,
  loader: 'file-loader',
}
…
```
