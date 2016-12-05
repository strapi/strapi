# Command Line Commands

## Initialization

```Shell
npm run setup
```

Initializes a new project with this boilerplate. Deletes the `react-boilerplate`
git history, installs the dependencies and initializes a new repository.

> Note: This command is self-destructive, once you've run it the init script is
gone forever. This is for your own safety, so you can't delete your project's
history irreversibly by accident.

## Development

```Shell
npm run start
```

Starts the development server running on `http://localhost:3000`

## Cleaning

```Shell
npm run clean
```

Deletes the example app, replacing it with the smallest amount of boilerplate
code necessary to start writing your app!

> Note: This command is self-destructive, once you've run it you cannot run it
again. This is for your own safety, so you can't delete portions of your project
irreversibly by accident.

## Generators

```Shell
npm run generate
```

Allows you to auto-generate boilerplate code for common parts of your
application, specifically `component`s, `container`s, and `route`s. You can
also run `npm run generate <part>` to skip the first selection. (e.g. `npm run
generate container`)

## Server

### Development

```Shell
npm start
```

Starts the development server and makes your application accessible at
`localhost:3000`. Tunnels that server with `ngrok`, which means the website
accessible anywhere! Changes in the application code will be hot-reloaded.

### Production

```Shell
npm run start:prod
```

Starts the production server, configured for optimal performance: assets are
minified and served gzipped.

### Port

To change the port the app is accessible at pass the `--port` option to the command
with `--`. E.g. to make the app visible at `localhost:5000`, run the following:
`npm start -- --port 5000`

## Building

```Shell
npm run build
```

Preps your app for deployment. Optimizes and minifies all files, piping them to
a folder called `build`. Upload the contents of `build` to your web server to
see your work live!

## Testing

See the [testing documentation](../testing/README.md) for detailed information
about our testing setup!

## Unit testing

```Shell
npm run test
```

Tests your application with the unit tests specified in the `*test.js` files
throughout the application.  
All the `test` commands allow an optional `-- --grep string` argument to filter
the tests ran by Karma. Useful if you need to run a specific test only.

```Shell
# Run only the Button component tests
npm run test:watch -- --grep Button
```

### Browsers

To choose the browser to run your unit tests in (Chrome by default), run one of
the following commands:

#### Firefox

```Shell
npm run test:firefox
```

#### Safari

```Shell
npm run test:safari
```

#### Internet Explorer

*Windows only!*

```Shell
npm run test:ie
```

### Watching

```Shell
npm run test:watch
```

Watches changes to your application and reruns tests whenever a file changes.

### Remote testing

```Shell
npm run start:tunnel
```
Starts the development server and tunnels it with `ngrok`, making the website
available on the entire world. Useful for testing on different devices in different locations!

### Performance testing

```Shell
npm run pagespeed
```

With the remote server running (i.e. while `npm run start:prod` is running in
another terminal session), enter this command to run Google PageSpeed Insights
and get a performance check right in your terminal!

### Dependency size test

```Shell
npm run analyze
```

This command will generate a `stats.json` file from your production build, which
you can upload to the [webpack analyzer](https://webpack.github.io/analyse/). This
analyzer will visualize your dependencies and chunks with detailed statistics
about the bundle size.

## Linting

```Shell
npm run lint
```

Lints your JavaScript and CSS.

### JavaScript

```Shell
npm run lint:js
```

Only lints your JavaScript.

### CSS

```Shell
npm run lint:css
```

Only lints your CSS.
