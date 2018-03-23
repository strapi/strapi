/* eslint-disable global-require */
const path = require('path');
const pkg = require(path.resolve(process.cwd(), 'package.json'));

// Dev middleware
const addDevMiddlewares = (app, webpackConfig) => {
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const compiler = webpack(webpackConfig);
  const middleware = webpackDevMiddleware(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath,
    silent: true,
    stats: 'errors-only',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'X-Forwarded-Host': 'strapi',
    },
  });

  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));

  // Since webpackDevMiddleware uses memory-fs internally to store build
  // artifacts, we use it instead
  const fs = middleware.fileSystem;

  if (pkg.dllPlugin) {
    app.get(/\.dll\.js$/, (req, res) => {
      const filename = req.path.replace(/^\//, '');
      res.sendFile(path.join(process.cwd(), pkg.dllPlugin.path, filename));
    });
  }

  app.get('*', (req, res) => {
    fs.readFile(path.join(compiler.outputPath, 'index.html'), (err, file) => {
      if (err) {
        res.sendStatus(404);
      } else {
        res.send(file.toString());
      }
    });
  });
};

/**
 * Front-end middleware
 */
module.exports = (app) => {
  const webpackConfig = require('../../internals/webpack/webpack.dev.babel');

  // const webpackConfig = require(path.resolve(process.cwd(), 'node_modules', 'strapi-helper-plugin', 'internals', 'webpack', 'webpack.dev.babel'));
  addDevMiddlewares(app, webpackConfig);

  return app;
};
