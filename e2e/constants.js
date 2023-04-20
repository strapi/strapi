export { CUSTOM_TRANSFER_TOKEN_ACCESS_KEY } from './app-template/template/src/constants';

export const ALLOWED_CONTENT_TYPES = ['admin::user', 'admin::role', 'admin::permission'];

// TODO: we should start using @strapi.io addresses to have the chance one day to
// actually receive and check the emails; also: it is not nice to spam other peoples
// websites
export const ADMIN_EMAIL_ADDRESS = 'test@testing.com';
export const ADMIN_PASSWORD = 'myTestPassw0rd';
