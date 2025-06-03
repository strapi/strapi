import type { sanitize } from '@strapi/utils';

export interface SanitizersRegistry {
  get(path: string): sanitize.Sanitizer[];
  add(path: string, sanitizer: sanitize.Sanitizer): this;
  set(path: string, value?: sanitize.Sanitizer[]): this;
  has(path: string): boolean;
}
