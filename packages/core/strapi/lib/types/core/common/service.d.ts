export type Service = {
  // TODO [V5] Consider changing the any value to unknown.
  // See: https://github.com/strapi/strapi/issues/16993 and https://github.com/strapi/strapi/pull/17020 for further information
  [key: keyof any]: any;
};
