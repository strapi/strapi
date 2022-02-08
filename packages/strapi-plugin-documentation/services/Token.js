'use strict';

const jwt = require('jsonwebtoken');

module.exports = {
  async create() {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'documentation',
    });
    const config = await pluginStore.get({ key: 'config' });

    return jwt.sign({}, config.password);
  },
  async validate(token) {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'documentation',
    });
    const config = await pluginStore.get({ key: 'config' });

    try {
      jwt.verify(token, config.password);
      return true;
    } catch (e) {
      return false;
    }
  },
};
