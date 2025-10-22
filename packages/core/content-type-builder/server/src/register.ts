import type { Core } from '@strapi/types';
import { CSP_DEFAULTS, extendMiddlewareConfiguration } from '@strapi/utils';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const aiEnabledConfig = strapi.config.get('admin.ai.enabled') !== false;
  const isAIEnabled = aiEnabledConfig && strapi.ee.features.isEnabled('cms-ai');

  if (isAIEnabled) {
    const s3Domains = [
      'strapi-ai-staging.s3.us-east-1.amazonaws.com',
      'strapi-ai-production.s3.us-east-1.amazonaws.com',
    ];

    const defaultImgSrc = CSP_DEFAULTS['img-src'];
    const defaultMediaSrc = CSP_DEFAULTS['media-src'];

    // Extend the security middleware configuration to include S3 domains + defaults
    const middlewares = strapi.config.get('middlewares') as (
      | string
      | { name?: string; config?: any }
    )[];

    const configuredMiddlewares = extendMiddlewareConfiguration(middlewares, {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          directives: {
            'img-src': [...defaultImgSrc, ...s3Domains],
            'media-src': [...defaultMediaSrc, ...s3Domains],
          },
        },
      },
    });

    strapi.config.set('middlewares', configuredMiddlewares);
  }
};
