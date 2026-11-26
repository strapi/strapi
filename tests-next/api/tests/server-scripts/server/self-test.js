'use strict';

/** The phases the hooks ran in, and a counter that actions share. */
const phases = [];
let counter = 0;

module.exports = {
  register({ strapi }) {
    phases.push({ hook: 'register', isLoaded: strapi.isLoaded });
  },

  bootstrap({ strapi }) {
    phases.push({ hook: 'bootstrap', isLoaded: strapi.isLoaded });
  },

  actions: {
    phases() {
      return phases;
    },

    increment(_, { by }) {
      counter += by;
      return counter;
    },

    echo({ strapi }, args) {
      return { args, appName: strapi.config.get('info.name') };
    },

    throwValidation() {
      const error = new Error('Invalid title');
      error.name = 'ValidationError';
      error.details = { path: ['title'] };
      throw error;
    },

    nothing() {},
  },
};
