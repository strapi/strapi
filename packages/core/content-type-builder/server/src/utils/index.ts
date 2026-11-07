import type { Services } from '../types';

export function getService<T extends keyof Services>(name: T): Services[T] {
  return strapi.plugin('content-type-builder').service<Services[T]>(name);
}
