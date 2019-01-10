'use strict';

/**
 * Documentation.js controller
 *
 * @description: A set of functions called "actions" of the `documentation` plugin.
 */

// Core dependencies.
const path = require('path');

// Public dependencies.
const fs = require('fs');
const cheerio = require('cheerio');
const _ = require('lodash');

module.exports = {
  getInfos: async (ctx) => {
    try {
      const prefix = _.get(strapi.plugins, ['documentation', 'config', 'x-strapi-config', 'path'], '/documentation');
      const service = strapi.plugins.documentation.services.documentation;
      const docVersions = service.retrieveDocumentationVersions();
      const form = await service.retrieveFrontForm();
      
      ctx.send({ docVersions, currentVersion: service.getDocumentationVersion(), prefix: `/${prefix}`.replace('//', '/'), form });
    } catch(err) {
      ctx.badRequest(null, err.message);
    }
  },

  index: async (ctx, next) => {
    // Read layout file.
    const layoutPath = path.join(strapi.config.appPath, 'plugins', 'documentation', 'public', 'index.html');

    try {
      const layout = fs.readFileSync(layoutPath, 'utf8');
      const $ = cheerio.load(layout);
      
      /**
       * We don't expose the specs using koa-static or something else due to security reasons.
       * That's why, we need to read the file localy and send the specs through it when we serve the Swagger UI.
       */
      const { major, minor, patch } = ctx.params;
      const version = major && minor && patch ? `${major}.${minor}.${patch}` : strapi.plugins.documentation.config.info.version;
      const openAPISpecsPath = path.join(strapi.config.appPath, 'plugins', 'documentation', 'documentation', version , 'full_documentation.json'); 
      
      try {  
        const documentation = fs.readFileSync(openAPISpecsPath, 'utf8');
        
        // Remove previous Swagger configuration.
        $('.custom-swagger-ui').remove();
        // Set new Swagger configuration
        $('body').append(`
          <script class="custom-swagger-ui">
            window.onload = function() {

              // Build a system
              const ui = SwaggerUIBundle({
                url: "https://petstore.swagger.io/v2/swagger.json",
                spec: ${JSON.stringify(JSON.parse(documentation))},
                dom_id: '#swagger-ui',
                docExpansion: "none",
                deepLinking: true,
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIStandalonePreset
                ],
                plugins: [
                  SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
              })

              window.ui = ui
            }
          </script>
        `);
          
        try {
          // Write the layout with the new Swagger configuration.
          fs.writeFileSync(layoutPath, $.html());

          // Serve the file.
          ctx.url = path.basename(`${ctx.url}/index.html`);

          try {
            return await strapi.koaMiddlewares.static(`./plugins/documentation/public`)(ctx, next);
          } catch (e) {
            console.error(e);
          }
        } catch (e){
          strapi.log.error(`Impossible to write the layout file at ${layoutPath}`);
          strapi.log.warn('This file needs to be writable to keep the documentation up-to-date.');
          console.error(e);
        }
      } catch (e) {
        strapi.log.error(`Impossible to read OpenAPI specs at ${openAPISpecsPath}`);
        strapi.log.warn('This file is required to serve the documentation.');
        console.error(e);
      }
    } catch (e) {
      strapi.log.error(`Impossible to read the layout file at ${layoutPath}`);
      strapi.log.warn('This file is required to serve the documentation.');
      console.error(e);
    }
  },

  loginView: async (ctx, next) => {
    const { error } = ctx.query;
    const layoutPath = path.join(strapi.config.appPath, 'plugins', 'documentation', 'public', 'login.html');

    try {
      const layout = fs.readFileSync(layoutPath, 'utf8');
      const $ = cheerio.load(layout);

      $('form').attr('action', `${strapi.plugins.documentation.config['x-strapi-config'].path}/login`);
      $('.error').text(_.isEmpty(error) ? '' : 'Wrong password...');

      try {
        fs.writeFileSync(layoutPath, $.html());

        ctx.url = path.basename(`${ctx.url}/login.html`);
        return await strapi.koaMiddlewares.static(`./plugins/documentation/public`)(ctx, next);
      } catch (e) {
        console.log(e);
      }
    } catch (e) {
      console.log(e);
    }
  },

  login: async (ctx) => {
    const { body: { password } } = ctx.request;
    const { password: storedPassword } = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'documentation',
      key: 'config',
    }).get();
    const isValid = strapi.plugins['users-permissions'].services.user.validatePassword(password, storedPassword);
    let querystring = '?error=password';

    if (isValid) {
      ctx.session.documentation = password;
      querystring = '';
    }

    ctx.redirect(`${strapi.plugins.documentation.config['x-strapi-config'].path}${querystring}`);
  },
  
  regenerateDoc: async (ctx) => {
    const service = strapi.plugins.documentation.services.documentation;
    const documentationVersions = service.retrieveDocumentationVersions().map(el => el.version);
    const { request: { body: { version }, admin } } = ctx;

    if (_.isEmpty(version)) {
      return ctx.badRequest(null, admin ? 'documentation.error.noVersion' : 'Please provide a version.');
    }

    if (!documentationVersions.includes(version)) {
      return ctx.badRequest(null, admin ? 'documentation.error.regenerateDoc.versionMissing' : 'The version you are trying to generate does not exist.');
    }

    try {
      strapi.reload.isWatching = false;
      const fullDoc = service.generateFullDoc(version);
      const documentationPath = service.getMergedDocumentationPath(version);
      // Write the file
      fs.writeFileSync(path.resolve(documentationPath, 'full_documentation.json'), JSON.stringify(fullDoc, null, 2), 'utf8');
      ctx.send({ ok: true });
    } catch(err) {
      ctx.badRequest(null, admin ? 'documentation.error.regenerateDoc' : 'An error occured');
    } finally {
      strapi.reload.isWatching = true;
    }
  },

  deleteDoc: async (ctx) => {
    strapi.reload.isWatching = false;
    const service = strapi.plugins.documentation.services.documentation;
    const documentationVersions = service.retrieveDocumentationVersions().map(el => el.version);
    const { request: { params: { version }, admin } } = ctx;

    if (_.isEmpty(version)) {
      return ctx.badRequest(null, admin ? 'documentation.error.noVersion' : 'Please provide a version.');
    }

    if (!documentationVersions.includes(version)) {
      return ctx.badRequest(null, admin ? 'documentation.error.deleteDoc.versionMissing' : 'The version you are trying to delete does not exist.');
    }

    try {
      await service.deleteDocumentation(version);
      ctx.send({ ok: true });
    } catch(err) {
      ctx.badRequest(null, admin ? 'notification.error' : err.message);
    } finally {
      strapi.reload.isWatching = true;
    }
  },

  updateSettings: async (ctx) => {
    const { admin, body: { restrictedAccess, password } } = ctx.request;
    const usersPermService = strapi.plugins['users-permissions'].services;
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'documentation',
    });
    const prevConfig = await pluginStore.get({ key: 'config' });

    if (restrictedAccess && _.isEmpty(password)) {
      return ctx.badRequest(null, admin ? 'users-permissions.Auth.form.error.password.provide' : 'Please provide a password');
    }

    const isNewPassword = !_.isEmpty(password) && password !== prevConfig.password;

    if (isNewPassword && usersPermService.user.isHashed(password)) {
      // Throw an error if the password selected by the user
      // contains more than two times the symbol '$'.
      return ctx.badRequest(null, admin ? 'users-permissions.Auth.form.error.password.format' : 'our password cannot contain more than three times the symbol `$`.');
    }

    if (isNewPassword) {
      prevConfig.password = await usersPermService.user.hashPassword({ password });
    }
    
    
    _.set(prevConfig, 'restrictedAccess', restrictedAccess);
    
    await pluginStore.set({ key: 'config', value: prevConfig });

    return ctx.send({ ok: true });
  },
};
