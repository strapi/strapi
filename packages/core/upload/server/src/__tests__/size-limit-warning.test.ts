import { createRequire } from 'node:module';
import type { Core } from '@strapi/types';

import { DEFAULT_MAX_FILE_SIZE, warnOnSizeLimitMismatch } from '../size-limit-warning';

const createStrapi = ({
  sizeLimit,
  middlewares = ['strapi::body'],
}: {
  sizeLimit?: number;
  middlewares?: unknown[];
}) =>
  ({
    config: {
      get: jest.fn((path: string) => {
        if (path === 'plugin::upload') return { sizeLimit };
        if (path === 'middlewares') return middlewares;
        return undefined;
      }),
    },
    log: { warn: jest.fn() },
  }) as unknown as Core.Strapi & { log: { warn: jest.Mock } };

const bodyWithMaxFileSize = (maxFileSize: unknown) => ({
  name: 'strapi::body',
  config: { formidable: { maxFileSize } },
});

describe('Upload size limit mismatch warning', () => {
  test('warns once when sizeLimit is higher than the body parser limit', () => {
    const strapi = createStrapi({
      sizeLimit: 500 * 1000 * 1000,
      middlewares: ['strapi::logger', bodyWithMaxFileSize(250 * 1000 * 1000)],
    });

    warnOnSizeLimitMismatch({ strapi });

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(strapi.log.warn).toHaveBeenCalledWith(
      'upload.config.sizeLimit is 500 MB (500000000 bytes) but formidable.maxFileSize on the strapi::body middleware is 250 MB (250000000 bytes). Uploads above 250 MB are rejected before they reach the upload plugin. Raise formidable.maxFileSize on the strapi::body middleware to at least 500000000 to allow uploads up to upload.config.sizeLimit.'
    );
  });

  test('compares against the body parser default when maxFileSize is not configured', () => {
    const strapi = createStrapi({ sizeLimit: 500 * 1000 * 1000 });

    warnOnSizeLimitMismatch({ strapi });

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(strapi.log.warn.mock.calls[0][0]).toContain('210 MB (209715200 bytes)');
  });

  test('stays quiet when both limits match', () => {
    const strapi = createStrapi({
      sizeLimit: 300 * 1000 * 1000,
      middlewares: [bodyWithMaxFileSize(300 * 1000 * 1000)],
    });

    warnOnSizeLimitMismatch({ strapi });

    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('stays quiet when sizeLimit is lower than the body parser limit', () => {
    const strapi = createStrapi({
      sizeLimit: 100 * 1000 * 1000,
      middlewares: [bodyWithMaxFileSize(300 * 1000 * 1000)],
    });

    warnOnSizeLimitMismatch({ strapi });

    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('stays quiet when sizeLimit is lower than the body parser default', () => {
    const strapi = createStrapi({ sizeLimit: 100 * 1000 * 1000 });

    warnOnSizeLimitMismatch({ strapi });

    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('stays quiet when both limits are left at their defaults', () => {
    const strapi = createStrapi({ sizeLimit: 1000000000 });

    warnOnSizeLimitMismatch({ strapi });

    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('warns when the body parser limit is lowered below the default sizeLimit', () => {
    const strapi = createStrapi({
      sizeLimit: 1000000000,
      middlewares: [bodyWithMaxFileSize(100 * 1000 * 1000)],
    });

    warnOnSizeLimitMismatch({ strapi });

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
  });

  test('stays quiet when both limits are set explicitly to their defaults', () => {
    const strapi = createStrapi({
      sizeLimit: 1000000000,
      middlewares: [bodyWithMaxFileSize(DEFAULT_MAX_FILE_SIZE)],
    });

    warnOnSizeLimitMismatch({ strapi });

    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('reads a string maxFileSize as a number', () => {
    const strapi = createStrapi({
      sizeLimit: 500 * 1000 * 1000,
      middlewares: [bodyWithMaxFileSize('250000000')],
    });

    warnOnSizeLimitMismatch({ strapi });

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(strapi.log.warn.mock.calls[0][0]).toContain('250 MB (250000000 bytes)');
  });

  test('matches the maxFileSize default of the formidable that koa-body runs', () => {
    const requireFromKoaBody = createRequire(require.resolve('koa-body'));

    expect(DEFAULT_MAX_FILE_SIZE).toBe(requireFromKoaBody('formidable').defaultOptions.maxFileSize);
  });
});
