import { factories } from '@strapi/strapi';

import { USER_UID } from '../constants';

/**
 * The core controller of the end-user type behind `/api/users` (`find`, `findOne`, `create`,
 * `update`, `delete`). Permissions, field rules, sanitizing and populate treat it like any other
 * content type, and no role is granted any of it by default: whoever needs it is granted it in the
 * role editor.
 */
export default factories.createCoreController(USER_UID);
