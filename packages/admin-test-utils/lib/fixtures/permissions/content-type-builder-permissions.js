'use strict';

const ctbPermissions = [
  {
    id: 2820,
    action: 'plugin::content-type-builder.read',
    subject: null,
    properties: {},
    conditions: [],
  },
  { id: 2821, action: 'plugin::upload.read', subject: null, properties: {}, conditions: [] },
  {
    id: 2822,
    action: 'plugin::upload.assets.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 2823,
    action: 'plugin::upload.assets.update',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 2824,
    action: 'plugin::upload.assets.download',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 2825,
    action: 'plugin::upload.assets.copy-link',
    subject: null,
    properties: {},
    conditions: [],
  },
];

module.exports = ctbPermissions;
