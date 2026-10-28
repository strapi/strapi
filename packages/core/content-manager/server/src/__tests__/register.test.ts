import register from '../register';
import history from '../history';
import preview from '../preview';

jest.mock('../history', () => ({
  __esModule: true,
  default: { register: jest.fn() },
}));

jest.mock('../preview', () => ({
  __esModule: true,
  default: { register: jest.fn() },
}));

describe('content-manager register', () => {
  it('registers the configuration rename handler', async () => {
    const registerAttributeRenameHandler = jest.fn();
    const strapi = { db: { schema: { registerAttributeRenameHandler } } };

    await register({ strapi } as never);

    expect(registerAttributeRenameHandler).toHaveBeenCalledTimes(1);
    expect(typeof registerAttributeRenameHandler.mock.calls[0][0]).toBe('function');
    expect(history.register).toHaveBeenCalledWith({ strapi });
    expect(preview.register).toHaveBeenCalledWith({ strapi });
  });
});
