import type { Core } from '@strapi/types';

import { ALLOWED_WEBHOOK_EVENTS } from './constants';
import { createResolveChannelMiddleware } from './middlewares/resolve-channel';
import { registerChannelsActions } from './services/permissions/actions';
import { getService } from './utils';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // The base "Default" channel: a real row, listed and pickable like any
  // other, undeletable, initially flagged as the default.
  await getService('channels').ensureDefaultChannel();

  // `X-Strapi-Channel` → `ctx.state.channel` on every request (admin + content API).
  strapi.server.use(createResolveChannelMiddleware(strapi));

  // RBAC actions gating channel management and override resets.
  await registerChannelsActions(strapi);

  // Overlay writes never fire the core `entry.*` events: declare the plugin's
  // own so they are subscribable from the webhooks UI.
  for (const [key, value] of Object.entries(ALLOWED_WEBHOOK_EVENTS)) {
    (strapi.get('webhookStore') as any).addAllowedEvent(key, value);
  }
};
