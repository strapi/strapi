'use strict';

const $ = require('cheerio');
const fs = require('fs');
const path = require('path');
const sendfile = require('koa-sendfile');
const _ = require('lodash');
/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {

  index: function *() {

    // Read the default `index.html` file from the admin panel build
    const html = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'build', 'index.html'));

    // Convert the stream to a string
    const htmlString = html.toString();

    // Use `cheerio` to parse the HTML string
    const parsedHTML = $.load(htmlString);

    // Some plugins are ignored
    const ignoredPlugins = ['admin', 'user'];

    // Inject `js` files from plugins builds in the main admin panel
    _.forEach(strapi.api, (value, pluginName) => {
      if (!_.includes(ignoredPlugins, pluginName)) {
        // Main plugin `js` file
        const pluginMainScript = $('<script>').attr('src', '/plugins/' + pluginName + '/main.js');
        parsedHTML('body').append(pluginMainScript);

        // Vendors plugin `js` file
        const pluginVendorScript = $('<script>').attr('src', '/plugins/' + pluginName + '/vendor.js');
        parsedHTML('body').append(pluginVendorScript);
      }
    });
    
    // Finally, send the HTML file with injected scripts
    this.body = parsedHTML.html();
  },

  file: function *() {
    yield sendfile(this, path.resolve(__dirname, '..', 'public', 'build', this.params.file));
    if (!this.status) this.throw(404);
  }
};
