import type { Core } from '@strapi/types';

import { PROVIDER_ACTIONS } from '../../admin-actions';
import { guard, guardAll } from './guard';

/**
 * The sign-in providers, under `/end-users/providers`. `:id` is the provider's id (`github`, `my-idp`),
 * never a database id; `PUT` to update, never `PATCH`. `POST` makes a custom OpenID Connect provider,
 * which needs `providers.custom` as well: a provider the admin points at an identity provider of
 * their own can sign in as a user. A `PUT` that edits a custom provider or changes "trust for
 * linking" needs it too, which the controller checks once it knows what the request changes.
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
      config: guardAll([PROVIDER_ACTIONS.update, PROVIDER_ACTIONS.custom]),
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
