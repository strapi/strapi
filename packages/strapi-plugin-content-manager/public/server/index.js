/* eslint consistent-return:0 */

const resolve = require('path').resolve;

const express = require('express');
const argv = require('minimist')(process.argv.slice(2));

const logger = require('./logger');
const setup = require('./middlewares/frontendMiddleware');

const app = express();

setup(app, {
  outputPath: resolve(process.cwd(), 'build'),
  publicPath: '/',
});

// get the intended port number, use port 3000 if not provided
const port = argv.port || process.env.PORT || 3000;

// Start your app.
app.listen(port, (err) => {
  if (err) {
    return logger.error(err.message);
  }

  // Print start logs.
  logger.appStarted(port);
});
