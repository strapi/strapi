'use strict';

const auditLogContentType = require('./content-types/audit-log');

const provider = {
  register({ strapi }) {
    this.strapi = strapi;
    strapi.container.get('content-types').add('admin::', { 'audit-log': auditLogContentType });
    this._registered = true;
    return this;
  },

  async saveEvent(event) {
    if (!this._registered) {
      throw Error('Audit log provider has not been registered');
    }

    // Rewrite userId key to user
    const auditLog = { ...event, user: event.userId };
    delete auditLog.userId;

    await this.strapi.entityService.create('admin::audit-log', { data: auditLog });
    return this;
  },
};

module.exports = provider;
