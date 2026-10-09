import type { Modules } from '@strapi/types';

export type RequestContext = NonNullable<ReturnType<Modules.RequestContext.RequestContext['get']>>;
