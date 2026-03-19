import { extendMiddlewareConfiguration, CSP_DEFAULTS } from '../security';

describe('security utilities', () => {
  describe('extendMiddlewareConfiguration', () => {
    describe('when middleware is a string', () => {
      it('should replace string middleware with object configuration', () => {
        const middlewares = ['strapi::logger', 'strapi::security', 'strapi::cors'];

        const newConfig = {
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'img-src': ['example.com'],
              },
            },
          },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result).toEqual([
          'strapi::logger',
          {
            name: 'strapi::security',
            config: {
              contentSecurityPolicy: {
                directives: {
                  'img-src': ['example.com'],
                },
              },
            },
          },
          'strapi::cors',
        ]);
      });

      it('should not modify other string middlewares', () => {
        const middlewares = ['strapi::logger', 'strapi::security', 'strapi::cors'];

        const newConfig = {
          name: 'strapi::security',
          config: { test: 'value' },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result[0]).toBe('strapi::logger');
        expect(result[2]).toBe('strapi::cors');
      });
    });

    describe('when middleware is an object', () => {
      it('should merge configurations with array concatenation', () => {
        const middlewares = [
          {
            name: 'strapi::security',
            config: {
              contentSecurityPolicy: {
                directives: {
                  'img-src': ["'self'", 'data:'],
                  'script-src': ["'self'"],
                },
              },
            },
          },
        ];

        const newConfig = {
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'img-src': ['example.com', 'another.com'],
                'media-src': ['media.com'],
              },
            },
          },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result[0]).toEqual({
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'img-src': ["'self'", 'data:', 'example.com', 'another.com'],
                'script-src': ["'self'"],
                'media-src': ['media.com'],
              },
            },
          },
        });
      });

      it('should merge deep nested objects', () => {
        const middlewares = [
          {
            name: 'strapi::security',
            config: {
              contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                  'frame-src': ["'self'"],
                },
              },
              hsts: {
                maxAge: 31536000,
              },
            },
          },
        ];

        const newConfig = {
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'img-src': ['example.com'],
              },
            },
            xssFilter: false,
          },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result[0]).toEqual({
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              useDefaults: true,
              directives: {
                'frame-src': ["'self'"],
                'img-src': ['example.com'],
              },
            },
            hsts: {
              maxAge: 31536000,
            },
            xssFilter: false,
          },
        });
      });

      it('should handle empty arrays correctly', () => {
        const middlewares = [
          {
            name: 'strapi::security',
            config: {
              contentSecurityPolicy: {
                directives: {
                  'img-src': [],
                },
              },
            },
          },
        ];

        const newConfig = {
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'img-src': ['example.com'],
              },
            },
          },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result[0].config.contentSecurityPolicy.directives['img-src']).toEqual([
          'example.com',
        ]);
      });

      it('should not mutate original arrays', () => {
        const originalImgSrc = ["'self'", 'data:'];
        const middlewares = [
          {
            name: 'strapi::security',
            config: {
              contentSecurityPolicy: {
                directives: {
                  'img-src': originalImgSrc,
                },
              },
            },
          },
        ];

        const newConfig = {
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'img-src': ['example.com'],
              },
            },
          },
        };

        extendMiddlewareConfiguration(middlewares, newConfig);

        // Original array should not be modified
        expect(originalImgSrc).toEqual(["'self'", 'data:']);
      });
    });

    describe('when middleware name does not match', () => {
      it('should return middlewares unchanged', () => {
        const middlewares = [
          'strapi::logger',
          {
            name: 'strapi::cors',
            config: { origin: true },
          },
        ];

        const newConfig = {
          name: 'strapi::security',
          config: { test: 'value' },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result).toEqual(middlewares);
        expect(result).not.toBe(middlewares); // Should be a new array
      });
    });

    describe('edge cases', () => {
      it('should handle empty middlewares array', () => {
        const middlewares: any[] = [];
        const newConfig = {
          name: 'strapi::security',
          config: { test: 'value' },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result).toEqual([]);
      });

      it('should handle middleware with no config', () => {
        const middlewares = [
          {
            name: 'strapi::security',
          },
        ];

        const newConfig = {
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'img-src': ['example.com'],
              },
            },
          },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result[0]).toEqual({
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'img-src': ['example.com'],
              },
            },
          },
        });
      });

      it('should handle middleware with undefined name', () => {
        const middlewares = [
          {
            config: { test: 'value' },
          },
        ];

        const newConfig = {
          name: 'strapi::security',
          config: { newTest: 'newValue' },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result[0]).toEqual({
          config: { test: 'value' },
        });
      });
    });

    describe('real-world scenarios', () => {
      it('should handle typical CSP extension for AI features', () => {
        const middlewares = [
          {
            name: 'strapi::security',
            config: {
              contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                  'frame-src': ["'self'"],
                  'script-src': ["'self'", "'unsafe-inline'"],
                },
              },
            },
          },
        ];

        const s3Domains = [
          'strapi-ai-staging.s3.us-east-1.amazonaws.com',
          'strapi-ai-production.s3.us-east-1.amazonaws.com',
        ];

        const newConfig = {
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'img-src': [...CSP_DEFAULTS['img-src'], ...s3Domains],
                'media-src': [...CSP_DEFAULTS['media-src'], ...s3Domains],
              },
            },
          },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result[0].config.contentSecurityPolicy.directives['img-src']).toEqual([
          "'self'",
          'data:',
          'blob:',
          'https://market-assets.strapi.io',
          'strapi-ai-staging.s3.us-east-1.amazonaws.com',
          'strapi-ai-production.s3.us-east-1.amazonaws.com',
        ]);

        expect(result[0].config.contentSecurityPolicy.directives['media-src']).toEqual([
          "'self'",
          'data:',
          'blob:',
          'strapi-ai-staging.s3.us-east-1.amazonaws.com',
          'strapi-ai-production.s3.us-east-1.amazonaws.com',
        ]);
      });

      it('should handle preview frame-src configuration', () => {
        const middlewares = [
          {
            name: 'strapi::security',
            config: {
              contentSecurityPolicy: {
                directives: {
                  'frame-src': ["'self'"],
                },
              },
            },
          },
        ];

        const allowedOrigins = ['https://preview.example.com', 'https://staging.example.com'];

        const newConfig = {
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'frame-src': allowedOrigins,
              },
            },
          },
        };

        const result = extendMiddlewareConfiguration(middlewares, newConfig);

        expect(result[0].config.contentSecurityPolicy.directives['frame-src']).toEqual([
          "'self'",
          'https://preview.example.com',
          'https://staging.example.com',
        ]);
      });
    });
  });
});
