'use strict';

// Dependencies.
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio')

module.exports = function() {
  return new Promise((resolve, reject) => {
    try {
      if (this.config.environment === 'test') {
        return resolve();
      }

      const sourcePath = path.resolve(this.config.appPath, 'admin', 'admin', 'build', 'index.html');

      fs.access(path.resolve(this.config.appPath, 'admin', 'admin'), err => {
        if (err && err.code !== 'ENOENT') {
          return reject(err);
        }

        // No admin.
        if (err && err.code === 'ENOENT') {
          return resolve();
        }

        // Try to access to path.
        fs.access(sourcePath, err => {
          if (err && err.code !== 'ENOENT') {
            return reject(err);
          } else if (err && err.code === 'ENOENT') {
            return resolve();
          }

          fs.readFile(sourcePath, (err, html) => {
            const $ = cheerio.load(html.toString());

            $('script').each(function(i, elem) {
              if ($(this).attr('src')) {
                const parse = path.parse($(this).attr('src'));

                $(this).attr('src', `${_.get(strapi.config.currentEnvironment.server, 'admin.path', '/admin')}/${parse.base}`);
              }
            });

            // Remove previous
            $('body').attr('front', `http://${strapi.config.currentEnvironment.server.host}:${strapi.config.currentEnvironment.server.port}${_.get(strapi.config.currentEnvironment.server, 'admin.path', '/admin')}`);
            $('body').attr('back', `http://${strapi.config.currentEnvironment.server.host}:${strapi.config.currentEnvironment.server.port}`);

            fs.writeFile(sourcePath, $.html(), (err) => {
              if (err) {
                return reject(err);
              }

              resolve();
            });
          });
        });
      });
    } catch (e) {
      reject(e);
    }
  });
};
