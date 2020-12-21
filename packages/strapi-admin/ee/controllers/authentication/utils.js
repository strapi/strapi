'use strict';

const getAdminStore = async () => strapi.store({ type: 'core', environment: '', name: 'admin' });

module.exports = {
  getAdminStore,
};
