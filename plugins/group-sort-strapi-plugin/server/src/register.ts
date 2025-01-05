import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../shared/constants';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // register phase

  strapi.customFields.register({
    name: 'order',
    type: 'integer',
    plugin: PLUGIN_ID
  });

  strapi.customFields.register({
    name: 'order2d',
    type: 'json',
    plugin: PLUGIN_ID
  });

  strapi.customFields.register({
    name: 'orderMultiline',
    type: 'json',
    plugin: PLUGIN_ID
  });
};

export default register;
