import { errors } from '@strapi/utils';
import { Component } from './components';
import { Schema } from '@strapi/types';

type ContentType = Schema.ContentType & { isDisplayed: boolean; apiID: string };

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
      data: {
        fieldSizes: Record<string, { default: number; isResizeable: boolean }>;
        components: Component[];
        contentTypes: ContentType[];
      };
    };
    error?: errors.ApplicationError;
  }
}
