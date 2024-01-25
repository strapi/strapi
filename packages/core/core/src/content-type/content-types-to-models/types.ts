import type { Model } from '@strapi/database';
import type { Schema } from '@strapi/types';

export interface Context {
  contentTypes: Record<string, Schema.ContentType>;
  models: Record<string, Model>;
}
