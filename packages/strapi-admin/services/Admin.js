'use strict';

/**
 * Module dependencies
 */

// Public dependencies.
const _ = require('lodash');
const $ = require('cheerio');
const fs = require('fs');
const path = require('path');

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {

  generateAdminIndexFile: () => {
    // Read the default `index.html` file from the admin panel build
    const html = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'build', 'index.html'));

    // Convert the stream to a string
    const htmlString = html.toString();

    // Use `cheerio` to parse the HTML string
    const parsedHTML = $.load(htmlString);

    // Some plugins are ignored
    const ignoredPlugins = ['admin', 'user'];

    // Inject `js` files from plugins builds in the main admin panel
    _.forEach(strapi.plugins, (value, pluginName) => {
      if (!_.includes(ignoredPlugins, pluginName)) {
        // Main plugin `js` file
        const pluginMainScript = $('<script>').attr('src', `/admin/${pluginName}/main.js`);
        parsedHTML('body').append(pluginMainScript);
      }
    });

    // Finally, return the HTML file with injected scripts
    return parsedHTML.html();
  }
};
