'use strict';

module.exports = {
  displayName: 'component-a',
  category: 'default',
  attributes: {
    name: {
      type: 'string',
    },
    name_private: {
      type: 'string',
      private: true,
    },
    password: {
      type: 'password',
    },
    nestedComponent: {
      type: 'component',
      component: 'default.component-nested',
      repeatable: false,
    },
  },
};
