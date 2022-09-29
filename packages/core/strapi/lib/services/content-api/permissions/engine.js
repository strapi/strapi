'use strict';

const permissions = require('@strapi/permissions');

module.exports = ({ providers }) => permissions.engine.new({ providers });
