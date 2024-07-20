import type * as components from '../services/components';
import type * as builder from '../services/builder';
import type * as contentTypes from '../services/content-types';
import type * as componentCategories from '../services/component-categories';
import type * as apiHandler from '../services/api-handler';

type S = {
  'content-types': typeof contentTypes;
  components: typeof components;
  'component-categories': typeof componentCategories;
  builder: typeof builder;
  'api-handler': typeof apiHandler;
};

export function getService<T extends keyof S>(
  name: T
): S[T] extends (...args: any[]) => any ? ReturnType<S[T]> : S[T] {
  return strapi.plugin('content-type-builder').service(name);
}
