/* eslint-disable @typescript-eslint/no-var-requires */

// eslint-disable-next-line node/no-extraneous-require
const { features } = require('@strapi/strapi/dist/utils/ee').default;

export const register = () => {
  if (features.isEnabled('cms-content-releases')) {
    // EE Code would be here
    console.log('cms-content-releases is enabled');
  }
};
