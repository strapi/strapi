'use strict';

module.exports = {
  'strapi-admin::isOwner': user => ({ 'strapi_created_by.id': user.id }),
};
