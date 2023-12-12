import { generateNewApp } from '@strapi/generate-new';

/**
 * `$ strapi new`
 *
 * Generate a new Strapi application.
 */

export default (...args: [string, object]) => {
  return generateNewApp(...args);
};
