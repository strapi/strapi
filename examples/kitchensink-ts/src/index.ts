import type { Strapi } from '@strapi/strapi';

export default {
  register({ strapi }: { strapi: Strapi }) {
    // No error when trying the access & set the
    strapi.customAddMethod = (n1, n2) => {
      return n1 + n2;
    };
  },

  bootstrap({ strapi }: { strapi: Strapi }) {
    const result = strapi.customAddMethod(11, 31);

    // This should print "42"
    console.log(result);
  },
};
