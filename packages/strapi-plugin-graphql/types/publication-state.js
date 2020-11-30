'use strict';

module.exports = {
  definition: `
  enum PublicationState {
    LIVE
    PREVIEW
  }
  `,
  resolver: {
    PublicationState: {
      LIVE: 'live',
      PREVIEW: 'preview',
    },
  },
};
