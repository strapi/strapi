'use strict';

module.exports = {
  displayName: 'component-b',
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
  },
};
