import { createCLI } from '../index';
import { build as nodeBuild } from '../../node/build';
import { develop as nodeDevelop } from '../../node/develop';

jest.mock('@strapi/cloud-cli', () => ({
  buildStrapiCloudCommands: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../node/build', () => ({
  build: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../node/develop', () => ({
  develop: jest.fn().mockResolvedValue(undefined),
}));

const nodeBuildMock = nodeBuild as jest.MockedFunction<typeof nodeBuild>;
const nodeDevelopMock = nodeDevelop as jest.MockedFunction<typeof nodeDevelop>;

const consoleMock = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  info: jest.spyOn(console, 'info').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
};

describe('commands', () => {
  afterEach(() => {
    consoleMock.error.mockClear();
    jest.clearAllMocks();
  });

  describe('buildStrapiCommand', () => {
    it('loads all commands without error', () => {
      createCLI([]);
      expect(consoleMock.error).not.toHaveBeenCalled();
    });
  });

  describe('install-deps CLI flags', () => {
    const argvWith = (command: string, ...args: string[]) => [
      'node',
      '/fake/strapi.js',
      command,
      ...args,
    ];

    it('passes installDeps false to build by default', async () => {
      const argv = argvWith('build');
      const cli = await createCLI(argv);
      await cli.parseAsync(argv);

      expect(nodeBuildMock).toHaveBeenCalledTimes(1);
      expect(nodeBuildMock).toHaveBeenCalledWith(
        expect.objectContaining({
          installDeps: false,
        })
      );
    });

    it('passes installDeps true to build when --install-deps is set', async () => {
      const argv = argvWith('build', '--install-deps');
      const cli = await createCLI(argv);
      await cli.parseAsync(argv);

      expect(nodeBuildMock).toHaveBeenCalledTimes(1);
      expect(nodeBuildMock).toHaveBeenCalledWith(
        expect.objectContaining({
          installDeps: true,
        })
      );
    });

    it('passes installDeps true to develop by default', async () => {
      const argv = argvWith('develop');
      const cli = await createCLI(argv);
      await cli.parseAsync(argv);

      expect(nodeDevelopMock).toHaveBeenCalledTimes(1);
      expect(nodeDevelopMock).toHaveBeenCalledWith(
        expect.objectContaining({
          installDeps: true,
        })
      );
    });

    it('passes installDeps false to develop when --no-install-deps is set', async () => {
      const argv = argvWith('develop', '--no-install-deps');
      const cli = await createCLI(argv);
      await cli.parseAsync(argv);

      expect(nodeDevelopMock).toHaveBeenCalledTimes(1);
      expect(nodeDevelopMock).toHaveBeenCalledWith(
        expect.objectContaining({
          installDeps: false,
        })
      );
    });
  });
});
