import type { Core } from '@strapi/types';
import type { Command } from 'commander';

import {
  validateContentTypeTransferOptions,
  validateContentTypeTransferOptionsForStrapi,
} from '../data-transfer';

jest.mock('@strapi/core', () => ({
  createStrapi: jest.fn(),
  compileStrapi: jest.fn(),
}));

const mockStrapi = {
  contentTypes: {
    'api::article.article': {},
    'api::category.category': {},
    'plugin::upload.file': {},
    'plugin::upload.folder': {},
  },
} as unknown as Core.Strapi;

const mockCommand = (opts: Record<string, unknown>): Command =>
  ({ opts: () => opts }) as unknown as Command;

describe('validateContentTypeTransferOptions', () => {
  test('allows exclude-content-types without only-content-types', () => {
    expect(() =>
      validateContentTypeTransferOptions(
        mockCommand({ excludeContentTypes: ['plugin::upload.file'] })
      )
    ).not.toThrow();
  });

  test('allows only-content-types without exclude-content-types', () => {
    expect(() =>
      validateContentTypeTransferOptions(
        mockCommand({ onlyContentTypes: ['api::article.article'] })
      )
    ).not.toThrow();
  });

  test('allows non-overlapping exclude and only content types', () => {
    expect(() =>
      validateContentTypeTransferOptions(
        mockCommand({
          excludeContentTypes: ['plugin::upload.file'],
          onlyContentTypes: ['api::article.article'],
        })
      )
    ).not.toThrow();
  });

  test('rejects overlapping exclude and only content types', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    expect(() =>
      validateContentTypeTransferOptions(
        mockCommand({
          excludeContentTypes: ['api::article.article', 'plugin::upload.file'],
          onlyContentTypes: ['api::article.article', 'api::category.category'],
        })
      )
    ).toThrow('process.exit');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('api::article.article'));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"--exclude-content-types" and "--only-content-types"')
    );
    expect(exit).toHaveBeenCalledWith(1);

    exit.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('validateContentTypeTransferOptionsForStrapi', () => {
  test('accepts known content types', () => {
    expect(() =>
      validateContentTypeTransferOptionsForStrapi(
        {
          excludeContentTypes: ['plugin::upload.file'],
          onlyContentTypes: ['api::article.article'],
        },
        mockStrapi
      )
    ).not.toThrow();
  });

  test('rejects unknown exclude content types', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    expect(() =>
      validateContentTypeTransferOptionsForStrapi(
        { excludeContentTypes: ['plugin::does-not-exist'] },
        mockStrapi
      )
    ).toThrow('process.exit');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown content type(s) for --exclude-content-types')
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('plugin::does-not-exist'));
    expect(exit).toHaveBeenCalledWith(1);

    exit.mockRestore();
    errorSpy.mockRestore();
  });

  test('rejects unknown only content types', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    expect(() =>
      validateContentTypeTransferOptionsForStrapi(
        { onlyContentTypes: ['plugin::does-not-exist'] },
        mockStrapi
      )
    ).toThrow('process.exit');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown content type(s) for --only-content-types')
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('plugin::does-not-exist'));
    expect(exit).toHaveBeenCalledWith(1);

    exit.mockRestore();
    errorSpy.mockRestore();
  });
});
