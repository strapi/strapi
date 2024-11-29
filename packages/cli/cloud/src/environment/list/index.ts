import action from './action';
import command from './command';
import type { StrapiCloudCommandInfo } from '../../types';

export { action, command };

export default {
  name: 'list-environments',
  description: 'List Strapi Cloud environments',
  action,
  command,
} as StrapiCloudCommandInfo;
