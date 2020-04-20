// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file you need to update the documentation accordingly
// Here's the file: strapi/docs/3.0.0-beta.x/guides/custom-admin.md#update-the-content-manager
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import { dateFormats as defaultDateFormats } from 'strapi-helper-plugin';

const dateFormats = {
  ...defaultDateFormats,
  // Customise the format by uncommenting the one you wan to override it corresponds to the type of your field
  // date: 'dddd, MMMM Do YYYY',
  //  datetime: 'dddd, MMMM Do YYYY HH:mm',
  // time: 'HH:mm A',
  // timestamp: 'dddd, MMMM Do YYYY HH:mm',
};

export default dateFormats;
