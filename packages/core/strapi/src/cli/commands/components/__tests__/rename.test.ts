import path from 'node:path';
import fse from 'fs-extra';

import { action as renameComponent } from '../rename';

const destroy = jest.fn();
const renameComponentService = jest.fn();
const load = jest.fn(async () => mockApp);

const mockApp = {
  load,
  destroy,
  dirs: { app: { root: '/tmp/strapi-app' } },
  plugin: jest.fn(() => ({
    service: jest.fn(() => ({ renameComponent: renameComponentService })),
  })),
};

jest.mock('@strapi/core', () => ({
  compileStrapi: jest.fn(async () => ({})),
  createStrapi: jest.fn(() => mockApp),
}));

jest.mock('fs-extra', () => ({
  readdir: jest.fn(),
}));

describe('rename:component command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    load.mockImplementation(async () => mockApp);
  });

  it('exits when neither a category nor a display name is provided', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renameComponent('default.hero', undefined, {})).rejects.toThrow('exit');

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(renameComponentService).not.toHaveBeenCalled();
    mockExit.mockRestore();
    error.mockRestore();
  });

  it('renames the component and reports generated migration files', async () => {
    (fse.readdir as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['2026.01.01T00.00.00.000.rename-fields.js']);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    await renameComponent('default.hero', 'shared', { displayName: 'Banner' });

    expect(renameComponentService).toHaveBeenCalledWith('default.hero', {
      category: 'shared',
      displayName: 'Banner',
    });
    expect(destroy).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Renamed component "default.hero"'));
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

    await renameComponent('default.hero', 'shared');

    expect(log).toHaveBeenCalledWith(expect.stringContaining('No rename migration was generated'));
    expect(destroy).toHaveBeenCalled();
    log.mockRestore();
  });
});
