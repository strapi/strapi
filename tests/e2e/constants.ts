export const {
  CUSTOM_TRANSFER_TOKEN_ACCESS_KEY,
} = require('./app-template/template/src/constants');

export const ALLOWED_CONTENT_TYPES = [
  'admin::user',
  'admin::role',
  'admin::permission',
  'admin::api-token',
  'admin::transfer-token',
  'api::article.article',
  'api::author.author',
  'api::homepage.homepage',
  'api::upcoming-match.upcoming-match',
  'plugin::content-releases.release',
  'plugin::content-releases.release-action',
  /**
   * UPLOADS
   */
  'plugin::upload.file',
];

export const TITLE_LOGIN = 'Strapi Admin';
export const TITLE_HOME = 'Homepage';

// TODO: we should start using @strapi.io addresses to have the chance one day to
// actually receive and check the emails; also: it is not nice to spam other peoples
// websites
export const ADMIN_EMAIL_ADDRESS = 'test@testing.com';
export const ADMIN_PASSWORD = 'Testing123!';
