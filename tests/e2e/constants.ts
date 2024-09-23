export const { CUSTOM_TRANSFER_TOKEN_ACCESS_KEY } = require('./app-template/src/constants');

// NOTE: anything included here needs to be included in all test datasets exports
export const ALLOWED_CONTENT_TYPES = [
  'admin::user',
  'admin::role',
  'admin::permission',
  'admin::api-token',
  'admin::transfer-token',
  'api::article.article',
  'api::author.author',
  'api::homepage.homepage',
  'api::product.product',
  'api::shop.shop',
  'api::upcoming-match.upcoming-match',
  'api::unique.unique',
  'plugin::content-manager.history-version',
  /**
   * I18N
   */
  'plugin::i18n.locale',
  /**
   * CONTENT RELEASES
   */
  'plugin::content-releases.release',
  'plugin::content-releases.release-action',
  /**
   * REVIEW WORKFLOWS
   */
  'plugin::review-workflows.workflow-stage',
  'plugin::review-workflows.workflow',
  /**
   * UPLOADS
   */
  'plugin::upload.file',
];

export const TITLE_LOGIN = 'Strapi Admin';
export const TITLE_HOME = 'Homepage | Strapi';

// TODO: we should start using @strapi.io addresses to have the chance one day to
// actually receive and check the emails; also: it is not nice to spam other peoples
// websites
export const ADMIN_EMAIL_ADDRESS = 'test@testing.com';
export const ADMIN_PASSWORD = 'Testing123!';

export const EDITOR_EMAIL_ADDRESS = 'editor@testing.com';
export const EDITOR_PASSWORD = 'Testing123!';
