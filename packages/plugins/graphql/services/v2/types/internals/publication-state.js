'use strict';

const { enumType } = require('nexus');

const { PUBLICATION_STATE_TYPE_NAME } = require('../constants');

const PublicationState = enumType({
  name: PUBLICATION_STATE_TYPE_NAME,

  members: {
    LIVE: 'live',
    PREVIEW: 'preview',
  },
});

module.exports = { PublicationState };
