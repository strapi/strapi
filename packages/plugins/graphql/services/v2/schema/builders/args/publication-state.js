'use strict';

const { arg } = require('nexus');

const { constants } = require('../../../types');

const PublicationStateArg = arg({
  type: constants.PUBLICATION_STATE_TYPE_NAME,
  default: 'live',
});

module.exports = { PublicationStateArg };
