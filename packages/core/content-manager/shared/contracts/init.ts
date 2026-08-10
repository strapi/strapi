import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';
import { Component } from './components';
import { ContentType } from './content-types';

type PreviewViewport = NonNullable<
  NonNullable<NonNullable<Core.Config.Admin['preview']>['config']['viewports']>['desktop']
>;

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
      previewViewports: Partial<Record<'desktop' | 'tablet' | 'mobile', PreviewViewport>>;
    };
    error?: errors.ApplicationError;
  }
}
