'use strict';
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn(() => Promise.resolve()),
  copy: jest.fn(() => Promise.resolve()),
  pathExists: jest.fn(() => Promise.resolve()),
}));

const { resolve, join } = require('path');
const fse = require('fs-extra');
const inquirer = require('inquirer');

const exportTemplate = require('../export-template');

describe('export:template command', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  it('creates a new template directory', async () => {
    fse.pathExists.mockReturnValue(false);
    const directory = '../test-dir';
    const templatePath = resolve(directory);
    const contentPath = join(templatePath, 'template');

    await exportTemplate(directory);

    expect(fse.pathExists).toHaveBeenCalledWith(contentPath);
    expect(fse.ensureDir).toHaveBeenCalledWith(contentPath);
  });

  it.each(['api', 'components', 'config/functions/bootstrap.js', 'data'])(
    'copies folder %s',
    async item => {
      const directory = '../test-dir';
      const templatePath = resolve(directory);
      const contentPath = join(templatePath, 'template');

      await exportTemplate(directory);

      expect(fse.copy).toHaveBeenCalledWith(join(process.cwd(), item), join(contentPath, item));
    }
  );

  describe('handles prompt input', () => {
    it('updates directory if confirmed', async () => {
      fse.pathExists.mockReturnValue(true);
      const mockInquiry = jest
        .spyOn(inquirer, 'prompt')
        .mockImplementationOnce(() => ({ confirm: true }));
      const directory = '../test-dir';
      const templatePath = resolve(directory);
      const contentPath = join(templatePath, 'template');

      await exportTemplate(directory);

      expect(fse.pathExists).toHaveBeenCalledWith(contentPath);
      expect(mockInquiry).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: expect.any(String), name: 'confirm', type: 'confirm' })
      );
      expect(fse.ensureDir).toHaveBeenCalled();
      expect(fse.copy).toHaveBeenCalled();
    });

    it('exits if not confirmed', async () => {
      fse.pathExists.mockReturnValue(true);
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockInquiry = jest
        .spyOn(inquirer, 'prompt')
        .mockImplementationOnce(() => ({ confirm: false }));

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const directory = '../test-dir';
      const templatePath = resolve(directory);
      const contentPath = join(templatePath, 'template');

      await exportTemplate(directory).catch(err => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(fse.pathExists).toHaveBeenCalledWith(contentPath);
      expect(mockInquiry).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: expect.any(String), name: 'confirm', type: 'confirm' })
      );
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(fse.ensureDir).not.toHaveBeenCalled();
      expect(fse.copy).not.toHaveBeenCalled();
    });
  });
});
