'use strict';

const _ = require('lodash');

const {
  validateComponentInput,
  validateUpdateComponentInput,
} = require('./validation/component');
const componentService = require('../services/Components');
const createSchemaManager = require('../services/schema-manager');

/**
 * Components controller
 */

module.exports = {
  /**
   * GET /components handler
   * Returns a list of available components
   * @param {Object} ctx - koa context
   */
  async getComponents(ctx) {
    const data = Object.keys(strapi.components).map(uid => {
      return componentService.formatComponent(strapi.components[uid]);
    });

    ctx.send({ data });
  },

  /**
   * GET /components/:uid
   * Returns a specific component
   * @param {Object} ctx - koa context
   */
  async getComponent(ctx) {
    const { uid } = ctx.params;

    const component = strapi.components[uid];

    if (!component) {
      return ctx.send({ error: 'component.notFound' }, 404);
    }

    ctx.send({ data: componentService.formatComponent(component) });
  },

  /**
   * POST /components
   * Creates a component and returns its infos
   * @param {Object} ctx - koa context
   */
  async createComponent(ctx) {
    const { body } = ctx.request;

    try {
      await validateComponentInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    strapi.reload.isWatching = false;

    const manager = createSchemaManager();
    await manager
      .edit(ctx => {
        const component = ctx.createComponent(body.component);

        const nestedComponentsToCreate = body.components.filter(
          compo => !_.has(compo, 'uid')
        );

        for (let compoToCreate of nestedComponentsToCreate) {
          ctx.createComponent(compoToCreate);
        }

        // const nestedComponentsToEdit = body.components.filter(
        //   compo => !_.has(compo, 'uid')
        // );

        // nestedComponentsToEdit.forEach(compo => {
        //   ctx.editComponent(compo.uid, compo);
        // });

        return component;
      })
      .then(component => {
        strapi.reload();

        ctx.send({ data: { uid: component.uid } }, 201);
      })
      .catch(error => {
        ctx.send({ error: error.message }, 400);
      });
  },

  /**
   * PUT /components/:uid
   * Updates a component and return its infos
   * @param {Object} ctx - koa context - enhanced koa context
   */
  async updateComponent(ctx) {
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const component = strapi.components[uid];

    if (!component) {
      return ctx.send({ error: 'component.notFound' }, 404);
    }

    try {
      await validateUpdateComponentInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const newUID = componentService.updateComponentUID(
      component,
      body.component
    );
    if (newUID !== uid && _.has(strapi.components, newUID)) {
      return ctx.send({ error: 'new.component.alreadyExists' }, 400);
    }

    strapi.reload.isWatching = false;

    const updatedComponent = await componentService.updateComponent({
      component,
      infos: body.component,
    });

    await componentService.updateComponentInModels(
      component.uid,
      updatedComponent.uid
    );

    setImmediate(() => strapi.reload());

    ctx.send({ data: updatedComponent });
  },

  /**
   * DELETE /components/:uid
   * Deletes a components and returns its old infos
   * @param {Object} ctx - koa context
   */
  async deleteComponent(ctx) {
    const { uid } = ctx.params;

    const component = strapi.components[uid];

    if (!component) {
      return ctx.send({ error: 'component.notFound' }, 404);
    }

    strapi.reload.isWatching = false;

    await componentService.deleteComponentInModels(component.uid);
    await componentService.deleteComponent(component);

    setImmediate(() => strapi.reload());

    ctx.send({ data: { uid } });
  },
};
