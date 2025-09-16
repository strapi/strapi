/**
 * This file ensures that the Strapi security middleware's Content Security Policy (CSP)
 * allows images and media from both the default sources ("'self'", 'data:', 'blob:')
 * and the required S3 domains for AI features. It checks for existing 'img-src' and 'media-src'
 * directives and adds the S3 domains if not present. If no directives exist but useDefaults is true,
 * it adds the defaults plus the S3 domains. This guarantees that all required sources are allowed
 * without overwriting user configuration.
 */
export default async () => {
  const s3Domains = [
    'strapi-ai-staging.s3.us-east-1.amazonaws.com',
    'strapi-ai-production.s3.us-east-1.amazonaws.com',
  ];
  const defaults = ["'self'", 'data:', 'blob:'];
  const middlewares = strapi.config.get('middlewares') as (
    | string
    | { name?: string; config?: any }
  )[];

  const configuredMiddlewares = middlewares.map((m) => {
    if (typeof m === 'object' && m.name === 'strapi::security') {
      const config = m.config || {};
      const csp = config.contentSecurityPolicy || {};
      const directives = csp.directives || {};
      // img-src
      let imgSrc = directives['img-src'];
      if (!imgSrc && csp.useDefaults) {
        imgSrc = [...defaults];
      }
      if (!imgSrc) {
        imgSrc = [];
      }
      imgSrc = Array.from(new Set([...imgSrc, ...s3Domains]));
      // media-src
      let mediaSrc = directives['media-src'];
      if (!mediaSrc && csp.useDefaults) {
        mediaSrc = [...defaults];
      }
      if (!mediaSrc) {
        mediaSrc = [];
      }
      mediaSrc = Array.from(new Set([...mediaSrc, ...s3Domains]));
      // Set back
      return {
        ...m,
        config: {
          ...config,
          contentSecurityPolicy: {
            ...csp,
            directives: {
              ...directives,
              'img-src': imgSrc,
              'media-src': mediaSrc,
            },
          },
        },
      };
    }
    return m;
  });

  strapi.config.set('middlewares', configuredMiddlewares);
};
