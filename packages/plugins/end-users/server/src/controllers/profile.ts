import { factories } from '@strapi/strapi';

import { PROFILE_UID } from '../constants';

/**
 * The core controller of the profile type behind `/api/profiles`. No role is granted it by default.
 * `controllers/me.ts` also uses it, for the sanitizing of the caller's own profile.
 */
export default factories.createCoreController(PROFILE_UID);
