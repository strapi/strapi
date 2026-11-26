import { describe, it, expect, vi, beforeEach } from 'vitest';
import adminProvider from '../admin';
import loadAdmin from '../../loaders/admin';

vi.mock('../../loaders/admin', () => ({ default: vi.fn() }));

const createMockStrapi = () => {
  const admin = {
    register: vi.fn(),
    bootstrap: vi.fn(),
    destroy: vi.fn(),
  };

  const strapi = {
    get: vi.fn((name: string) => (name === 'admin' ? admin : undefined)),
  } as any;

  return { strapi, admin };
};

describe('admin provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      await adminProvider.destroy!(registered.strapi);

      expect(unregistered.admin.destroy).not.toHaveBeenCalled();
      expect(registered.admin.destroy).toHaveBeenCalledTimes(1);
      expect(registered.admin.destroy).toHaveBeenCalledWith({ strapi: registered.strapi });
    });
  });
});
