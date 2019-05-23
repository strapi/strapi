const path = require('path');
const webpackConfig = require('./webpack.config.js');

module.exports = () => {
  const entry = path.join(__dirname, 'admin', 'src', 'app.js');
  const dest = path.join(__dirname, 'build');
  const env = 'development';
  const options = {
    backend: 'http://localhost:1337',
    publicPath: '/admin/',
  };

  const args = {
    entry,
    dest,
    env,
    options,
  };

  return {
    ...webpackConfig(args),
    devServer: {
      port: 4000,
      clientLogLevel: 'none',
      hot: true,
      quiet: true,
      historyApiFallback: {
        index: '/admin/',
      },
    },
  };
};
