'use strict';

const yup = require('yup');
const formatYupErrors = require('./utils/yup-formatter');

const groupSchema = yup.object().shape({
  name: yup.string().required(),
  connection: yup.string(),
  collectionName: yup.string(),
  attributes: yup.object().required(),
});

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
   */
  async getGroups(ctx) {
    const data = await strapi.groupManager.all();
    ctx.send({ data });
  },

  /**
   * GET /groups/:uid
   * Returns a specific group
   * @param {*} ctx
   */
  async getGroup(ctx) {
    const { uid } = ctx.params;

    const group = await strapi.groupManager.get(uid);

    if (!group) {
      return ctx.send({ error: 'group.notFound' }, 404);
    }

    ctx.send({ data: group });
  },

  async createGroup(ctx) {
    const { body } = ctx.request;

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
   * Updates a group and return it
   * @param {Object} ctx - enhanced koa context
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
