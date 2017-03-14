module.exports = {
  plugins: [
    require('postcss-smart-import')(),
    require('precss')(),
    require('autoprefixer')()
  ]
};