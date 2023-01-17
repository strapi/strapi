'use strict';

/**
 * A map of all the available Strapi lifecycles
 * @type {import('@strapi/strapi').Core.Lifecycles}
 */
const LIFECYCLES = {
  REGISTER: 'register',
  BOOTSTRAP: 'bootstrap',
  DESTROY: 'destroy',
};

module.exports = {
  LIFECYCLES,
};
