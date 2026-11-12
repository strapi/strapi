// Document filters print differently from develop in generic positions (`Target<any>` on develop,
// the resolved relation target here) because schemas resolve through the strict-aware registries.
// The same filters are accepted and rejected, for concrete and generic content type UIDs.
import type { Core, Modules, UID } from '@strapi/strapi';

declare const strapi: Core.Strapi;

export const concrete = () => [
  strapi.documents('api::article.article').findMany({
    filters: { title: 'x', author: { name: { $eq: 'y' } }, views: { $gt: 1 } },
  }),
  strapi.documents('api::article.article').findMany({
    // @ts-expect-error A nested relation filter checks its attribute values.
    filters: { author: { articles: { title: 123 } } },
  }),
  strapi.documents('api::article.article').findMany({
    // @ts-expect-error A filter checks its attribute values.
    filters: { title: 123 },
  }),
];

export const generic = <TUID extends UID.ContentType>(
  uid: TUID,
  filters: Modules.Documents.Params.Filters.Any<TUID>
) => [
  strapi.documents(uid).findMany({ filters }),
  strapi.documents(uid).findMany({
    // @ts-expect-error Unknown attributes are rejected for a generic UID.
    filters: { title: 'x', anything: { nested: true } },
  }),
];
