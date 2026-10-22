import type { Core } from '@strapi/strapi';

// No contract export, and a factory checked against its own UID: the registered type is inferred
// from this factory. Type generation marks the UID as inferred, so the check fails (TS2344) instead
// of being circular. Only registered by the negative test.
export default (() => ({
  ping: () => 'pong' as const,
})) satisfies Core.ControllerFactory<'api::article.cycle'>;
