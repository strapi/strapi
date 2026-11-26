import { errors } from '@strapi/utils';
import type { Modules } from '@strapi/types';
import { Component } from './components';
import { ContentType } from './content-types';

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
      contentStructure?: Modules.ContentStructure.ResolvedContentStructure;
    };
    error?: errors.ApplicationError;
  }
}
