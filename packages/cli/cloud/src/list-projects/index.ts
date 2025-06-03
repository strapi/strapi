import action from './action';
import command from './command';
import type { StrapiCloudCommandInfo } from '../types';

export { action, command };

export default {
  name: 'list-projects',
  description: 'List Strapi Cloud projects',
  action,
  command,
} as StrapiCloudCommandInfo;
