'use strict';

/**
 * Documentation.js controller
 *
 * @description: A set of functions called "actions" of the `documentation` plugin.
 */

// Core dependencies.
const path = require('path');
const bcrypt = require('bcryptjs');

// Public dependencies.
const fs = require('fs-extra');
const _ = require('lodash');
const koaStatic = require('koa-static');

module.exports = {
  async getInfos(ctx) {
    try {
      const docService = strapi.plugin('documentation').service('documentation');
      const docVersions = docService.getDocumentationVersions();
      const documentationAccess = await docService.getDocumentationAccess();

      ctx.send({
        docVersions,
        currentVersion: docService.getDocumentationVersion(),
        prefix: strapi.plugin('documentation').config('x-strapi-config').path,
        documentationAccess,
      });
    } catch (err) {
      ctx.badRequest(null, err.message);
    }
  },

  async index(ctx, next) {
    try {
      /**
       * We don't expose the specs using koa-static or something else due to security reasons.
       * That's why, we need to read the file localy and send the specs through it when we serve the Swagger UI.
       */
      const { major, minor, patch } = ctx.params;
      const version =
        major && minor && patch
          ? `${major}.${minor}.${patch}`
          : strapi.plugin('documentation').service('documentation').getDocumentationVersion();

      const openAPISpecsPath = path.join(
        strapi.dirs.app.extensions,
        'documentation',
        'documentation',
        version,
        'full_documentation.json'
      );

      try {
        const documentation = fs.readFileSync(openAPISpecsPath, 'utf8');
        if ('json' in ctx.query)
          return ctx.send(JSON.parse(documentation));
        const layout = fs.readFileSync(
          path.resolve(__dirname, '..', 'public', 'index.html'),
          'utf8'
        );
        const filledLayout = _.template(layout)({
          backendUrl: strapi.config.server.url,
          spec: JSON.stringify(JSON.parse(documentation)),
        });

        try {
          const layoutPath = path.resolve(
            strapi.dirs.app.extensions,
            'documentation',
            'public',
            'index.html'
          );
          await fs.ensureFile(layoutPath);
          await fs.writeFile(layoutPath, filledLayout);

          // Serve the file.
          ctx.url = path.basename(`${ctx.url}/index.html`);

          try {
            const staticFolder = path.resolve(
              strapi.dirs.app.extensions,
              'documentation',
              'public'
            );
            return koaStatic(staticFolder)(ctx, next);
          } catch (e) {
            strapi.log.error(e);
          }
        } catch (e) {
          strapi.log.error(e);
        }
      } catch (e) {
        strapi.log.error(e);
      }
    } catch (e) {
      strapi.log.error(e);
    }
  },

  async loginView(ctx, next) {
    // lazy require cheerio
    const cheerio = require('cheerio');

    const { error } = ctx.query;

    try {
      const layout = fs.readFileSync(path.join(__dirname, '..', 'public', 'login.html'));
      const filledLayout = _.template(layout)({
        actionUrl: `${strapi.config.server.url}${
          strapi.config.get('plugin.documentation.x-strapi-config').path
        }/login`,
      });
      const $ = cheerio.load(filledLayout);

      $('.error').text(_.isEmpty(error) ? '' : 'Wrong password...');

      try {
        const layoutPath = path.resolve(
          strapi.dirs.app.extensions,
          'documentation',
          'public',
          'login.html'
        );
        await fs.ensureFile(layoutPath);
        await fs.writeFile(layoutPath, $.html());

        ctx.url = path.basename(`${ctx.url}/login.html`);

        try {
          const staticFolder = path.resolve(strapi.dirs.app.extensions, 'documentation', 'public');
          return koaStatic(staticFolder)(ctx, next);
        } catch (e) {
          strapi.log.error(e);
        }
      } catch (e) {
        strapi.log.error(e);
      }
    } catch (e) {
      strapi.log.error(e);
    }
  },

  async login(ctx) {
    const {
      body: { password },
    } = ctx.request;

    const { password: hash } = await strapi
      .store({ type: 'plugin', name: 'documentation', key: 'config' })
      .get();

    const isValid = await bcrypt.compare(password, hash);

    let querystring = '?error=password';

    if (isValid) {
      ctx.session.documentation = {
        logged: true,
      };

      querystring = '';
    }

    ctx.redirect(
      `${strapi.config.server.url}${
        strapi.config.get('plugin.documentation.x-strapi-config').path
      }${querystring}`
    );
  },

  async regenerateDoc(ctx) {
    const { version } = ctx.request.body;

    const service = strapi.service('plugin::documentation.documentation');

    const documentationVersions = service.getDocumentationVersions().map((el) => el.version);

    if (_.isEmpty(version)) {
      return ctx.badRequest('Please provide a version.');
    }

    if (!documentationVersions.includes(version)) {
      return ctx.badRequest('The version you are trying to generate does not exist.');
    }

    try {
      strapi.reload.isWatching = false;
      await service.generateFullDoc(version);
      ctx.send({ ok: true });
    } finally {
      strapi.reload.isWatching = true;
    }
  },

  async deleteDoc(ctx) {
    const { version } = ctx.params;

    const service = strapi.service('plugin::documentation.documentation');

    const documentationVersions = service.getDocumentationVersions().map((el) => el.version);

    if (_.isEmpty(version)) {
      return ctx.badRequest('Please provide a version.');
    }

    if (!documentationVersions.includes(version)) {
      return ctx.badRequest('The version you are trying to delete does not exist.');
    }

    try {
      strapi.reload.isWatching = false;
      await service.deleteDocumentation(version);
      ctx.send({ ok: true });
    } finally {
      strapi.reload.isWatching = true;
    }
  },

  async updateSettings(ctx) {
    const { restrictedAccess, password } = ctx.request.body;

    const pluginStore = strapi.store({ type: 'plugin', name: 'documentation' });

    const config = {
      restrictedAccess: Boolean(restrictedAccess),
    };

    if (restrictedAccess) {
      if (_.isEmpty(password)) {
        return ctx.badRequest('Please provide a password');
      }

      config.password = await bcrypt.hash(password, 10);
    }

    await pluginStore.set({ key: 'config', value: config });

    return ctx.send({ ok: true });
  },
};
