const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const packageJson = require('./package.json');

const nodeModules = [];
[
  ...Object.keys(packageJson.dependencies),
  ...Object.keys(packageJson.peerDependencies),
  ...Object.keys(packageJson.devDependencies),
].forEach(module => {
  nodeModules.push(new RegExp(`^${module}(/.+)?$`));
});

module.exports = {
  entry: `${__dirname}/lib/src/index.js`,
  externals: nodeModules,
  mode: process.env.NODE_ENV,
  devtool: process.env.NODE_ENV === 'development' ? 'eval-source-map' : false,
  output: {
    path: `${__dirname}/build`,
    filename: `helper-plugin.${process.env.NODE_ENV}.js`,
    library: {
      name: 'helperPlugin',
      type: 'umd',
    },
    umdNamedDefine: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'lib', 'src'),
        loader: 'babel-loader',
        exclude: /(node_modules)/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },

      {
        test: /\.(png|svg|jpg|gif)$/,
        loader: 'url-loader',
        options: {
          limit: 8192,
        },
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js'],
    cacheWithContext: false,
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
    }),
    new MiniCssExtractPlugin({
      filename: 'style.css',
    }),
  ],
};
