// Looks up a service and a controller whose factories are checked against their own UID without a
// contract export (`app/src/api/article/{services,controllers}/cycle.ts`). Type generation marks
// these UIDs as inferred, so each factory check fails with TS2344 whatever the order the checker
// reaches the files in, and the lookups keep the inferred type. Without the marker, a lookup
// checked first closed the cycle: TS7022 in the source, and an `any` lookup.
import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

const service = app.service('api::article.cycle');
service.ping() satisfies 'pong';
// @ts-expect-error The lookup is the inferred service, not `any`.
service satisfies number;

const controller = app.controller('api::article.cycle');
controller.ping() satisfies 'pong';
// @ts-expect-error The lookup is the inferred controller, not `any`.
controller satisfies number;
