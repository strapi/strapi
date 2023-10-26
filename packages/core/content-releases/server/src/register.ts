/* eslint-disable @typescript-eslint/no-var-requires */

const { features } = require('@strapi/strapi/dist/utils/ee');

export const register = () => {
  if (features.isEnabled('cms-content-releases')) {
    // EE Code would be here
    console.log('cms-content-releases is enabled');
  }
};
