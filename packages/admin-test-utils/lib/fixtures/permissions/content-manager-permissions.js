'use strict';

const cmPermissions = [
  {
    id: 2817,
    action: 'plugins::content-manager.single-types.configure-view',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 2818,
    action: 'plugins::content-manager.collection-types.configure-view',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 2819,
    action: 'plugins::content-manager.components.configure-layout',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'plugins::content-manager.explorer.create',
    subject: 'foo',
    properties: {
      fields: ['f1'],
    },
    conditions: [],
  },
  {
    action: 'plugins::content-manager.explorer.create',
    subject: 'foo',
    properties: {
      fields: ['f2'],
    },
    conditions: [],
  },
  {
    action: 'plugins::content-manager.explorer.read',
    subject: 'foo',
    properties: {
      fields: ['f1'],
    },
    conditions: [],
  },
  {
    action: 'plugins::content-manager.explorer.delete',
    subject: 'bar',
  },
  {
    action: 'plugins::content-manager.explorer.update',
    subject: 'bar',
    properties: {
      fields: ['f1'],
    },
    conditions: [],
  },
];

module.exports = cmPermissions;
