'use strict';

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn(() => Promise.resolve()),
  copy: jest.fn(() => Promise.resolve()),
  pathExists: jest.fn(() => Promise.resolve()),
  writeJSON: jest.fn(() => Promise.resolve()),
}));

const { resolve, join } = require('path');
const fse = require('fs-extra');
const inquirer = require('inquirer');

const exportTemplate = require('../generate-template');

describe('generate:template command', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  it('creates a new template directory', async () => {
    fse.pathExists.mockReturnValue(false);
    const directory = '../test-dir';
    const rootPath = resolve(directory);
    const templatePath = join(rootPath, 'template');

    await exportTemplate(directory);

    expect(fse.pathExists).toHaveBeenCalledWith(templatePath);
    expect(fse.ensureDir).toHaveBeenCalledWith(templatePath);
  });

  it.each(['src', 'data'])('copies folder %s', async (item) => {
    // Mock the empty directory arg
    fse.pathExists.mockReturnValueOnce(false);
    // Mock the folder exists
    fse.pathExists.mockReturnValue(true);
    const directory = '../test-dir';
    const rootPath = resolve(directory);
    const templatePath = join(rootPath, 'template');

    await exportTemplate(directory);

    expect(fse.pathExists).toHaveBeenCalledWith(join(process.cwd(), item));
    expect(fse.copy).toHaveBeenCalledWith(join(process.cwd(), item), join(templatePath, item));
  });

  it('creates a json config file', async () => {
    fse.pathExists.mockReturnValue(false);
    const directory = '../test-dir';
    const rootPath = resolve(directory);

    await exportTemplate(directory);

    expect(fse.pathExists).toHaveBeenCalledWith(join(rootPath, 'template.json'));
    expect(fse.writeJSON).toHaveBeenCalledWith(join(rootPath, 'template.json'), {});
  });

  describe('handles prompt input', () => {
    it('replaces directory if confirmed', async () => {
      fse.pathExists.mockReturnValue(true);
      const mockInquiry = jest
        .spyOn(inquirer, 'prompt')
        .mockImplementationOnce(() => ({ confirm: true }));
      const directory = '../test-dir';
      const rootPath = resolve(directory);
      const templatePath = join(rootPath, 'template');

      await exportTemplate(directory);

      expect(fse.pathExists).toHaveBeenCalledWith(templatePath);
      expect(mockInquiry).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: expect.any(String), name: 'confirm', type: 'confirm' })
      );
      expect(fse.ensureDir).toHaveBeenCalled();
      expect(fse.copy).toHaveBeenCalled();
    });

    it('does not replace existing config file', async () => {
      fse.pathExists.mockReturnValue(true);
      jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ confirm: true }));
      const directory = '../test-dir';
      const rootPath = resolve(directory);

      await exportTemplate(directory);
      expect(fse.pathExists).toHaveBeenCalledWith(join(rootPath, 'template.json'));
      expect(fse.writeJSON).not.toHaveBeenCalled();
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
      const rootPath = resolve(directory);
      const templatePath = join(rootPath, 'template');

      await exportTemplate(directory).catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(fse.pathExists).toHaveBeenCalledWith(templatePath);
      expect(mockInquiry).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: expect.any(String), name: 'confirm', type: 'confirm' })
      );
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(fse.ensureDir).not.toHaveBeenCalled();
      expect(fse.copy).not.toHaveBeenCalled();
    });
  });
});
