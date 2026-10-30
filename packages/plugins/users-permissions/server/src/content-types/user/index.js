'use strict';

const schemaConfig = require('./schema-config');

module.exports = {
  collectionName: 'up_users',
  info: {
    name: 'user',
    description: '',
    singularName: 'user',
    pluralName: 'users',
    displayName: 'User',
  },
  options: {
    timestamps: true,
  },
  attributes: {
    username: {
      type: 'string',
      minLength: 3,
      unique: true,
      configurable: false,
      required: true,
    },
    email: {
      type: 'email',
      minLength: 6,
      configurable: false,
      required: true,
    },
    provider: {
      type: 'string',
      configurable: false,
    },
    password: {
      type: 'password',
      minLength: 6,
      configurable: false,
      private: true,
      searchable: false,
    },
    resetPasswordToken: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    confirmationToken: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    confirmed: {
      type: 'boolean',
      default: false,
      configurable: false,
    },
    blocked: {
      type: 'boolean',
      default: false,
      configurable: false,
    },
    role: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::users-permissions.role',
      inversedBy: 'users',
      configurable: false,
    },
  },

  config: schemaConfig, // TODO: to move to content-manager options
};
