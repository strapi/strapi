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
      id: nonNull('ID'),
      data: nonNull(userInputName),
    },

    description: 'Update an existing user',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      koaContext.params = { id: args.id };
      koaContext.request.body = toPlainObject(args.data);

      await strapi.plugin('users-permissions').controller('user').update(koaContext);

      checkBadRequest(koaContext.body);

      return {
        value: koaContext.body,
        info: { args, resourceUID: 'plugin::users-permissions.user' },
      };
    },
  };
};
