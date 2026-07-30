import type { Core } from '@strapi/types';

import { DEFAULT_SPACE_SLUG } from './services/spaces';

const WEBHOOKS_LIST_RE = /^\/admin\/webhooks\/?$/;
const WEBHOOK_DETAIL_RE = /^\/admin\/webhooks\/([^/]+)\/?$/;
const WEBHOOKS_BATCH_DELETE_RE = /^\/admin\/webhooks\/batch-delete\/?$/;

const STORE_KEY = 'webhook-bindings';

type WebhookBindings = Record<string, string[]>;

/**
 * Spaces × webhooks. Webhooks aren't a content type (they live in the
 * webhook store), so the M2M visibility pattern doesn't apply — the
 * workspace binding lives in the plugin's own core-store instead:
 * `{ [webhookId]: workspaceSlugs[] }`, absent entry = platform-wide.
 *
 * Rules (same shape as tokens):
 *   - created from a workspace → bound to it; created from default →
 *     platform-wide;
 *   - outside default, the list only shows the workspace's webhooks (and
 *     platform-wide ones) and direct detail access to others is a 404;
 *   - default sees and manages everything.
 *
 * TODO(spaces): scoping webhook TRIGGERING per workspace (only firing for
 * events of the bound workspaces) is a separate slice — event emission needs a
 * workspace dimension first.
 */
export const patchWebhooksForSpaces = (strapi: Core.Strapi) => {
  const store = strapi.store({ type: 'plugin', name: 'spaces' });

  const getBindings = async (): Promise<WebhookBindings> =>
    ((await store.get({ key: STORE_KEY })) as WebhookBindings | null) ?? {};

  const setBindings = async (bindings: WebhookBindings) =>
    store.set({ key: STORE_KEY, value: bindings });

  const isVisible = (bindings: WebhookBindings, id: string, spaceSlug: string): boolean => {
    const bound = bindings[id];
    return !Array.isArray(bound) || bound.length === 0 || bound.includes(spaceSlug);
  };

  strapi.server.use(async (ctx: any, next: () => Promise<any>) => {
    const isWebhookRoute = ctx.path.startsWith('/admin/webhooks');
    if (!isWebhookRoute) {
      return next();
    }

    const spaceSlug = ctx.state?.spaceSlug as string | undefined;
    const isDefault = !spaceSlug || spaceSlug === DEFAULT_SPACE_SLUG;

    const detailMatch = !WEBHOOKS_BATCH_DELETE_RE.test(ctx.path)
      ? ctx.path.match(WEBHOOK_DETAIL_RE)
      : null;

    /* ---- Before the controller ---- */

    if (!isDefault) {
      // Webhooks not visible in this workspace don't exist for it.
      if (detailMatch && ['GET', 'PUT', 'DELETE'].includes(ctx.method)) {
        const bindings = await getBindings();
        if (!isVisible(bindings, detailMatch[1], spaceSlug)) {
          return ctx.notFound('Webhook not found in this workspace');
        }
      }

      // Batch delete: silently narrow to the webhooks this workspace can see.
      if (ctx.method === 'POST' && WEBHOOKS_BATCH_DELETE_RE.test(ctx.path)) {
        const bindings = await getBindings();
        const ids: unknown[] = Array.isArray(ctx.request?.body?.ids) ? ctx.request.body.ids : [];
        ctx.request.body = {
          ...ctx.request.body,
          ids: ids.filter((id) => isVisible(bindings, String(id), spaceSlug)),
        };
      }
    }

    await next();

    /* ---- After the controller ---- */

    if (ctx.status >= 400) {
      return;
    }

    // Creation from a workspace binds the webhook to it.
    if (
      !isDefault &&
      ctx.method === 'POST' &&
      WEBHOOKS_LIST_RE.test(ctx.path) &&
      ctx.body?.data?.id !== undefined
    ) {
      const bindings = await getBindings();
      bindings[String(ctx.body.data.id)] = [spaceSlug];
      await setBindings(bindings);
      return;
    }

    // Deletions drop the binding so ids can be recycled safely.
    if (ctx.method === 'DELETE' && detailMatch) {
      const bindings = await getBindings();
      if (bindings[detailMatch[1]]) {
        delete bindings[detailMatch[1]];
        await setBindings(bindings);
      }
      return;
    }

    // Outside default, the list only shows this workspace's webhooks.
    if (!isDefault && ctx.method === 'GET' && WEBHOOKS_LIST_RE.test(ctx.path)) {
      if (Array.isArray(ctx.body?.data)) {
        const bindings = await getBindings();
        ctx.body.data = ctx.body.data.filter((webhook: { id: unknown }) =>
          isVisible(bindings, String(webhook.id), spaceSlug)
        );
      }
    }
  });
};
