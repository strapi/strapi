import action from './action';
import command from './command';
import type { StrapiCloudCommandInfo } from '../types';

export { action, command };

export default {
  name: 'link-project',
  description: 'link a local directory to a Strapi Cloud project',
  action,
  command,
} as StrapiCloudCommandInfo;
