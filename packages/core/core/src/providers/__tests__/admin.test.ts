import adminProvider from '../admin';
import loadAdmin from '../../loaders/admin';

jest.mock('../../loaders/admin', () => jest.fn());

const createMockStrapi = () => {
  const admin = {
    register: jest.fn(),
    bootstrap: jest.fn(),
    destroy: jest.fn(),
  };

  const strapi = {
    get: jest.fn((name: string) => (name === 'admin' ? admin : undefined)),
  } as any;

  return { strapi, admin };
};

describe('admin provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('destroy', () => {
    it('does not destroy the admin when the admin was never registered', async () => {
      const { strapi, admin } = createMockStrapi();

      await expect(adminProvider.destroy!(strapi)).resolves.toBeUndefined();

      expect(admin.destroy).not.toHaveBeenCalled();
    });

    it('destroys the admin after the admin was registered', async () => {
      const { strapi, admin } = createMockStrapi();

      await adminProvider.register!(strapi);
      await adminProvider.destroy!(strapi);

      expect(loadAdmin).toHaveBeenCalledWith(strapi);
      expect(admin.destroy).toHaveBeenCalledTimes(1);
      expect(admin.destroy).toHaveBeenCalledWith({ strapi });
    });

    it('only destroys the admin of the instance that registered it', async () => {
      const registered = createMockStrapi();
      const unregistered = createMockStrapi();

      await adminProvider.register!(registered.strapi);
      await adminProvider.destroy!(unregistered.strapi);

      expect(unregistered.admin.destroy).not.toHaveBeenCalled();
    });
  });
});
