# Can I use Sass with this boilerplate?

Yes, although we advise against it and **do not support this**. We selected
PostCSS over Sass because its approach is more powerful: instead of trying to
give a styling language programmatic abilities, it pulls logic and configuration
out into JS where we believe those features belong.

As an alternative, consider installing a PostCSS plugin called [`PreCSS`](https://github.com/jonathantneal/precss):
it lets you use familiar syntax - $variables, nesting, mixins, etc. - but retain
the advantages (speed, memory efficiency, extensibility, etc) of PostCSS.

If you _really_ still want (or need) to use Sass then...

1. Change `internals/webpack/webpack.base.babel.js` so that line 22 reads
    ```JavaScript
    test: /\.s?css$/,
    ```

    This means that both `.scss` and `.css` will be picked up by the compiler

1. Update each of

    - `internals/webpack/webpack.dev.babel.js`
    - `internals/webpack/webpack.prod.babel.js`

    changing the config option for `cssLoaders` to

    ```JavaScript
    cssLoaders: 'style-loader!css-loader?modules&importLoaders=1&sourceMap!postcss-loader!sass-loader',
    ```

    Then run `npm i -D sass-loader node-sass`

...and you should be good to go!
