'use strict';

const ctbPermissions = [
  {
    id: 2820,
    action: 'plugins::content-type-builder.read',
    subject: null,
    properties: {},
    conditions: [],
  },
  { id: 2821, action: 'plugins::upload.read', subject: null, properties: {}, conditions: [] },
  {
    id: 2822,
    action: 'plugins::upload.assets.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 2823,
    action: 'plugins::upload.assets.update',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 2824,
    action: 'plugins::upload.assets.download',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    id: 2825,
    action: 'plugins::upload.assets.copy-link',
    subject: null,
    properties: {},
    conditions: [],
  },
];

module.exports = ctbPermissions;
