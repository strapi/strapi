import { errors } from '@strapi/utils';
import type { Component } from './components';
import type { ContentType } from './content-types';

/**
 * GET /init
 */
export declare namespace GetInitData {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: {
      fieldSizes: Record<string, { default: number; isResizable: boolean }>;
      components: Component[];
      contentTypes: ContentType[];
    };
    error?: errors.ApplicationError;
  }
}
