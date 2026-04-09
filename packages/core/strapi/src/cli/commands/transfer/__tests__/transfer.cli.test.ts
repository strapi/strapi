import { createCLI } from '../../../index';
import { getInquirer } from '../../../utils/get-inquirer';
import transferAction from '../action';

jest.mock('@strapi/cloud-cli', () => ({
  buildStrapiCloudCommands: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../action', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../utils/get-inquirer', () => ({
  getInquirer: jest.fn(),
}));

const mockedTransferAction = transferAction as jest.MockedFunction<typeof transferAction>;
const mockedGetInquirer = getInquirer as jest.MockedFunction<typeof getInquirer>;

describe('transfer CLI (commander)', () => {
  let inquirerPrompt: jest.Mock;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    inquirerPrompt = jest.fn();
    mockedGetInquirer.mockResolvedValue({ prompt: inquirerPrompt } as any);
    delete process.env.STRAPI_TRANSFER_URL;
    delete process.env.STRAPI_TRANSFER_TOKEN;
  });

  /** Commander invokes `.action(fn)` as `fn(opts, command)` */
  const expectActionWith = (expected: Record<string, unknown>) => {
    expect(mockedTransferAction).toHaveBeenCalledWith(
      expect.objectContaining(expected),
      expect.anything()
    );
  };

  const argvWithTransfer = (...transferArgs: string[]) => [
    'node',
    '/fake/strapi.js',
    'transfer',
    ...transferArgs,
  ];

  it('does not prompt when --from, --from-token, and --force are set', async () => {
    const argv = argvWithTransfer(
      '--from',
      'https://source.strapi.io/admin',
      '--from-token',
      'source-secret',
      '--force'
    );
    const cli = await createCLI(argv);
    await cli.parseAsync(argv);

    expect(inquirerPrompt).not.toHaveBeenCalled();
    expect(mockedTransferAction).toHaveBeenCalledTimes(1);
    const [opts] = mockedTransferAction.mock.calls[0];
    expect(opts.from).toEqual(new URL('https://source.strapi.io/admin'));
    expectActionWith({
      fromToken: 'source-secret',
      force: true,
    });
  });

  it('does not prompt when --to, --to-token, and --force are set', async () => {
    const argv = argvWithTransfer(
      '--to',
      'https://dest.strapi.io/admin',
      '--to-token',
      'dest-secret',
      '--force'
    );
    const cli = await createCLI(argv);
    await cli.parseAsync(argv);

    expect(inquirerPrompt).not.toHaveBeenCalled();
    expect(mockedTransferAction).toHaveBeenCalledTimes(1);
    const [opts] = mockedTransferAction.mock.calls[0];
    expect(opts.to).toEqual(new URL('https://dest.strapi.io/admin'));
    expectActionWith({
      toToken: 'dest-secret',
      force: true,
    });
  });

  it('forwards --exclude without prompting when remote flags are complete', async () => {
    const argv = argvWithTransfer(
      '--from',
      'https://source.strapi.io/admin',
      '--from-token',
      'source-secret',
      '--exclude',
      'files',
      '--force'
    );
    const cli = await createCLI(argv);
    await cli.parseAsync(argv);

    expect(inquirerPrompt).not.toHaveBeenCalled();
    expectActionWith({
      exclude: ['files'],
      force: true,
    });
    const [opts] = mockedTransferAction.mock.calls[0];
    expect(opts.from).toEqual(new URL('https://source.strapi.io/admin'));
  });

  it('forwards --only without prompting when remote flags are complete', async () => {
    const argv = argvWithTransfer(
      '--from',
      'https://source.strapi.io/admin',
      '--from-token',
      'source-secret',
      '--only',
      'content',
      '--force'
    );
    const cli = await createCLI(argv);
    await cli.parseAsync(argv);

    expect(inquirerPrompt).not.toHaveBeenCalled();
    expectActionWith({
      only: ['content'],
      force: true,
    });
  });

  it('runs interactive flow when no URL flags are passed and reaches the action', async () => {
    inquirerPrompt
      .mockResolvedValueOnce({ dir: 'from' })
      .mockResolvedValueOnce({ remoteUrl: 'https://remote.strapi.io/admin' })
      .mockResolvedValueOnce({ token: 'interactive-token' })
      .mockResolvedValueOnce({ confirm: true });

    const argv = argvWithTransfer();
    const cli = await createCLI(argv);
    await cli.parseAsync(argv);

    expect(mockedGetInquirer).toHaveBeenCalled();
    expect(inquirerPrompt).toHaveBeenCalled();
    expect(mockedTransferAction).toHaveBeenCalledTimes(1);
    const [opts] = mockedTransferAction.mock.calls[0];
    expect(opts.from).toEqual(new URL('https://remote.strapi.io/admin'));
    expectActionWith({
      fromToken: 'interactive-token',
    });
  });
});
