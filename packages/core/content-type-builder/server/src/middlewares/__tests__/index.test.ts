import type { Core } from '@strapi/types';

import * as middlewares from '..';
import isDevelopmentModeHandler from '../is-development-mode';

describe('registered middlewares', () => {
  it('registers isDevelopmentMode as a factory returning the handler', () => {
    expect(middlewares.isDevelopmentMode()).toBe(isDevelopmentModeHandler);
  });

  it('instantiates isDevelopmentMode like a middleware referenced by name', () => {
    // What @strapi/core resolveMiddlewares does with `plugin::content-type-builder.isDevelopmentMode`
    const factory: Core.MiddlewareFactory = middlewares.isDevelopmentMode;

    expect(factory({}, { strapi: {} as Core.Strapi })).toBe(isDevelopmentModeHandler);
  });
});
