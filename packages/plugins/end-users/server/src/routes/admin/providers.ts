import type { Core } from '@strapi/types';

import { PROVIDER_ACTIONS } from '../../admin-actions';
import { guard } from './guard';

/**
 * The sign-in providers, under `/end-users/providers`. `:id` is the provider's id (`github`, `my-idp`),
 * never a database id; `PUT` to update, never `PATCH`. `POST` makes a custom OpenID Connect provider.
 */
const routes: Core.RouterInput = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/providers',
      handler: 'provider.find',
      config: guard(PROVIDER_ACTIONS.read),
    },
    {
      method: 'GET',
      path: '/providers/:id',
      handler: 'provider.findOne',
      config: guard(PROVIDER_ACTIONS.read),
    },
    {
      method: 'POST',
      path: '/providers',
      handler: 'provider.create',
      config: guard(PROVIDER_ACTIONS.update),
    },
    {
      method: 'PUT',
      path: '/providers/:id',
      handler: 'provider.update',
      config: guard(PROVIDER_ACTIONS.update),
    },
    {
      method: 'DELETE',
      path: '/providers/:id',
      handler: 'provider.delete',
      config: guard(PROVIDER_ACTIONS.update),
    },
  ],
};

export default routes;
