import type { Core } from '@strapi/strapi';

// No contract export, and a factory checked against its own UID: the registered type is inferred
// from this factory, so the check is circular (TS7022). Only registered by the negative test.
export default (() => ({
  ping: () => 'pong' as const,
})) satisfies Core.ServiceFactory<'api::article.cycle'>;
