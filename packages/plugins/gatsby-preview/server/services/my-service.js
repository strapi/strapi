'use strict';

module.exports = ({ strapi }) => ({
  getWelcomeMessage() {
    console.log(strapi);
    return 'Welcome to Strapi 🚀';
  },
});
