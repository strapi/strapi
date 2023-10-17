/* eslint-disable @typescript-eslint/no-var-requires */

// eslint-disable-next-line node/no-extraneous-require
const { features } = require('@strapi/strapi/dist/utils/ee').default;

export const register = () => {
  if (features.isEnabled('cms-content-releases')) {
    // TODO: Remove this log once we actually do stuff
    console.log('Releases server loaded...');
  }
};
