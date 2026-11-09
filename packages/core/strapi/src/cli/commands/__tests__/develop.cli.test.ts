import { command } from '../develop';
import { develop as nodeDevelop } from '../../../node/develop';

jest.mock('../../../node/develop', () => ({
  develop: jest.fn().mockResolvedValue(undefined),
}));

const mockedDevelop = nodeDevelop as jest.MockedFunction<typeof nodeDevelop>;

const ctx = {
  cwd: '/tmp/app',
  logger: { warn: jest.fn() },
};

const parse = async (...args: string[]) => {
  const cmd = command({ command: undefined as never, argv: [], ctx } as never);
  await cmd.parseAsync(['node', 'strapi', ...args], { from: 'user' });
};

describe('develop CLI', () => {
  beforeEach(() => {
    mockedDevelop.mockClear();
  });

  it('opens the admin by default', async () => {
    await parse();

    expect(mockedDevelop).toHaveBeenCalledWith(expect.objectContaining({ open: true }));
  });

  it('sets open to false when --no-open is passed', async () => {
    await parse('--no-open');

    expect(mockedDevelop).toHaveBeenCalledWith(expect.objectContaining({ open: false }));
  });

  it('keeps the other default-true flags when --no-open is passed', async () => {
    await parse('--no-open');

    expect(mockedDevelop).toHaveBeenCalledWith(
      expect.objectContaining({
        open: false,
        watchAdmin: true,
        buildAdmin: true,
        installDeps: true,
      })
    );
  });
});
