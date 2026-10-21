// Looks up a service whose factory is checked against its own UID without a contract export
// (`app/src/api/article/services/cycle.ts`). When the checker reaches this lookup before that
// source, as for a controller that uses the service, the lookup closes the cycle: TypeScript
// reports TS7022 in the source, and the lookup is `any`, so the `satisfies` below is not reported.
import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

app.service('api::article.cycle') satisfies number;
