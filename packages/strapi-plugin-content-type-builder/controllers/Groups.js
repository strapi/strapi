'use strict';

const yup = require('yup');
const formatYupErrors = require('./utils/yup-formatter');

const groupSchema = yup.object({
  name: yup.string().required('name.required'),
  connection: yup.string(),
  collectionName: yup.string(),
  attributes: yup.object().required('attributes.required'),
});

// shorter access to the group service
const internals = {
  get service() {
    return strapi.plugins['content-type-builder'].services.groups;
  },
};

/**
 * Groups controller
 */

module.exports = {
  /**
   * GET /groups handler
   * Returns a list of available groups
   * @param {Object} ctx - koa context
   */
  async getGroups(ctx) {
    const data = await strapi.groupManager.all();
    ctx.send({ data });
  },

  /**
   * GET /groups/:uid
   * Returns a specific group
   * @param {Object} ctx - koa context
   */
  async getGroup(ctx) {
    const { uid } = ctx.params;

    const group = await strapi.groupManager.get(uid);

    if (!group) {
      return ctx.send({ error: 'group.notFound' }, 404);
    }

    ctx.send({ data: group });
  },

  /**
   * POST /groups
   * Creates a group and returns its infos
   * @param {Object} ctx - koa context
   */
  async createGroup(ctx) {
    const { body } = ctx.request;

    await ctx.validate(groupSchema);
    try {
      await groupSchema.validate(body, {
        strict: true,
        abortEarly: false,
      });
    } catch (error) {
      return ctx.send({ error: formatYupErrors(error) }, 400);
    }

    const uid = internals.service.createGroupUID(body.name);

    if (strapi.groupManager.get(uid) !== undefined) {
      return ctx.send({ error: 'group.alreadyExists' }, 400);
    }

    const newGroup = await internals.service.createGroup(uid, body);

    ctx.send({ data: newGroup }, 201);
  },

  /**
   * PUT /groups/:uid
   * Updates a group and return its infos
   * @param {Object} ctx - koa context - enhanced koa context
   */
  async updateGroup(ctx) {
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const group = await strapi.groupManager.get(uid);

    if (!group) {
      return ctx.send({ error: 'group.notFound' }, 404);
    }

    try {
      await groupSchema.validate(body, {
        strict: true,
        abortEarly: false,
      });
    } catch (error) {
      return ctx.send({ error: formatYupErrors(error) }, 400);
    }

    const updatedGroup = await internals.service.updateGroup(group, body);

    ctx.send({ data: updatedGroup }, 200);
  },

  /**
   * DELETE /groups/:uid
   * Deletes a groups and returns its old infos
   * @param {Object} ctx - koa context
   */
  async deleteGroup(ctx) {
    const { uid } = ctx.params;

    const group = await strapi.groupManager.get(uid);

    if (!group) {
      return ctx.send({ error: 'group.notFound' }, 404);
    }

    await internals.service.deleteGroup(group);

    ctx.send({ data: group }, 200);
  },
};
