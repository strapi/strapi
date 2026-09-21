import path from 'node:path';
import fse from 'fs-extra';

import { action as renameField } from '../rename-field';

const destroy = jest.fn();
const renameAttribute = jest.fn();
const load = jest.fn(async () => mockApp);

const mockApp = {
  load,
  destroy,
  dirs: { app: { root: '/tmp/strapi-app' } },
  plugin: jest.fn(() => ({
    service: jest.fn(() => ({ renameAttribute })),
  })),
};

jest.mock('@strapi/core', () => ({
  compileStrapi: jest.fn(async () => ({})),
  createStrapi: jest.fn(() => mockApp),
}));

jest.mock('fs-extra', () => ({
  readdir: jest.fn(),
}));

describe('rename:field command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    load.mockImplementation(async () => mockApp);
  });

  it('renames the attribute and reports generated migration files', async () => {
    (fse.readdir as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['2026.01.01T00.00.00.000.rename-fields.js']);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    await renameField('api::article.article', 'title', 'heading');

    expect(renameAttribute).toHaveBeenCalledWith('api::article.article', 'title', 'heading');
    expect(destroy).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Renamed "title" to "heading"'));
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(
        path.join(
          '/tmp/strapi-app',
          'database',
          'migrations',
          '2026.01.01T00.00.00.000.rename-fields.js'
        )
      )
    );
    log.mockRestore();
  });

  it('warns when no migration file is generated', async () => {
    (fse.readdir as jest.Mock).mockRejectedValue(new Error('ENOENT'));
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    await renameField('api::article.article', 'title', 'heading');

    expect(log).toHaveBeenCalledWith(expect.stringContaining('No rename migration was generated'));
    expect(destroy).toHaveBeenCalled();
    log.mockRestore();
  });
});
