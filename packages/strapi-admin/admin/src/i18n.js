/**
 * i18n.js
 *
 * This will setup the i18n language files and locale data for your plugin.
 *
 */

// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file you also need to update the documentation accordingly
// Here's the file: strapi/docs/3.0.0-beta.x/admin-panel/customization.md#customize-the-strapi-admin-package
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import translationMessages from './translations';

const languages = Object.keys(translationMessages);

export { languages, translationMessages };
