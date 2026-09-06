'use strict';

const { toPlainObject } = require('lodash/fp');

const { checkBadRequest } = require('../../../utils');

const usersPermissionsUserUID = 'plugin::users-permissions.user';

module.exports = ({ nexus, strapi }) => {
  const { nonNull } = nexus;
  const { getContentTypeInputName, getEntityResponseName } = strapi
    .plugin('graphql')
    .service('utils').naming;

  const userContentType = strapi.getModel(usersPermissionsUserUID);

  const userInputName = getContentTypeInputName(userContentType);
  const responseName = getEntityResponseName(userContentType);

  return {
    type: nonNull(responseName),

    args: {
      data: nonNull(userInputName),
    },

    description: 'Create a new user',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      koaContext.params = {};
      koaContext.request.body = toPlainObject(args.data);

      await strapi.plugin('users-permissions').controller('user').create(koaContext);

      checkBadRequest(koaContext.body);

      return {
        value: koaContext.body,
        info: { args, resourceUID: 'plugin::users-permissions.user' },
      };
    },
  };
};
