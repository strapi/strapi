'use strict';

const Strapi = require('./Strapi');

Strapi.factories = require('./factories');
Strapi.requestContext = require('./services/request-context');
Strapi.compile = require('./compile');

module.exports = Strapi;
