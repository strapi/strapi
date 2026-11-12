import { errors } from '@strapi/utils';

import { getService as getContentManagerService } from '../../../utils';
import { getDocumentLocaleAndStatus } from '../../../controllers/validation/dimensions';
import { getService, isFeatureEnabled } from '../../utils';
import { createCustomOrderController } from '../custom-order';

jest.mock('../../../utils', () => ({
  getService: jest.fn(),
}));

jest.mock('../../../controllers/validation/dimensions', () => ({
  getDocumentLocaleAndStatus: jest.fn(async () => ({ locale: 'en' })),
}));

jest.mock('../../utils', () => ({
  getService: jest.fn(),
  isFeatureEnabled: jest.fn(() => true),
}));

const MODEL = 'api::article.article';

const createCtx = ({
  id = 'a',
  body = {},
  query = {},
}: {
  id?: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
} = {}) => ({
  params: { model: MODEL, id },
  query,
  request: { body },
  state: { userAbility: { can: () => true } },
  notFound: jest.fn(() => 'notFound'),
  forbidden: jest.fn(() => 'forbidden'),
});

const setup = ({
  isEnabled = [true],
  canUpdate = true,
  canUpdateDocument = true,
  document = { documentId: 'a' } as Record<string, unknown> | null,
}: {
  isEnabled?: boolean[];
  canUpdate?: boolean;
  canUpdateDocument?: boolean;
  document?: Record<string, unknown> | null;
} = {}) => {
  const customOrder = {
    isEnabled: jest.fn(),
    refresh: jest.fn(async () => {}),
    move: jest.fn(async () => {}),
  };
  isEnabled.forEach((value, index) => {
    if (index === isEnabled.length - 1) {
      customOrder.isEnabled.mockReturnValue(value);
    } else {
      customOrder.isEnabled.mockReturnValueOnce(value);
    }
  });

  const permissionChecker = {
    cannot: {
      update: jest.fn((entity?: unknown) => (entity ? !canUpdateDocument : !canUpdate)),
    },
    sanitizedQuery: {
      update: jest.fn(async (query: unknown) => ({ ...(query as object), sanitized: true })),
    },
  };
  const populateBuilder = {
    populateFromQuery: jest.fn(),
    build: jest.fn(async () => ({ author: true })),
  };
  populateBuilder.populateFromQuery.mockReturnValue(populateBuilder);
  const documentManager = { findOne: jest.fn(async () => document) };

  jest.mocked(getService).mockReturnValue(customOrder as any);
  jest.mocked(getContentManagerService).mockImplementation(((name: string) => {
    switch (name) {
      case 'permission-checker':
        return { create: jest.fn(() => permissionChecker) };
      case 'populate-builder':
        return jest.fn(() => populateBuilder);
      case 'document-manager':
        return documentManager;
      default:
        throw new Error(`Unexpected service ${name}`);
    }
  }) as any);

  const controller = createCustomOrderController({ strapi: {} as any });

  return { controller, customOrder, permissionChecker, populateBuilder, documentManager };
};

describe('Custom order controller', () => {
  beforeEach(() => {
    jest.mocked(isFeatureEnabled).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('move', () => {
    test('Is not found while the feature flag is off', async () => {
      jest.mocked(isFeatureEnabled).mockReturnValue(false);
      const { controller, customOrder } = setup();
      const ctx = createCtx({ body: { before: 'b' } });

      await expect(controller.move(ctx as any)).resolves.toBe('notFound');

      expect(ctx.notFound).toHaveBeenCalled();
      expect(customOrder.move).not.toHaveBeenCalled();
    });

    test.each([
      ['neither before nor after', {}],
      ['both before and after', { before: 'b', after: 'c' }],
      ['an empty anchor', { before: '' }],
    ])('Rejects a body with %s', async (_label, body) => {
      const { controller, customOrder } = setup();

      await expect(controller.move(createCtx({ body }) as any)).rejects.toThrow(
        errors.ValidationError
      );
      expect(customOrder.move).not.toHaveBeenCalled();
    });

    test('Rejects moving an entry next to itself', async () => {
      const { controller, customOrder } = setup();

      await expect(controller.move(createCtx({ body: { after: 'a' } }) as any)).rejects.toThrow(
        'An entry cannot be moved next to itself'
      );
      expect(customOrder.move).not.toHaveBeenCalled();
    });

    test('Rejects moving an entry of a content type without custom order', async () => {
      const { controller, customOrder } = setup({ isEnabled: [false] });

      await expect(controller.move(createCtx({ body: { before: 'b' } }) as any)).rejects.toThrow(
        'Custom order is not enabled for this content type'
      );

      // The setting may have just been turned on from another instance
      expect(customOrder.refresh).toHaveBeenCalledTimes(1);
      expect(customOrder.move).not.toHaveBeenCalled();
    });

    test('Reads the settings again before refusing to move an entry', async () => {
      const { controller, customOrder } = setup({ isEnabled: [false, true] });

      await controller.move(createCtx({ body: { before: 'b' } }) as any);

      expect(customOrder.refresh).toHaveBeenCalledTimes(1);
      expect(customOrder.move).toHaveBeenCalledTimes(1);
    });

    test('Is forbidden to users who cannot update the content type', async () => {
      const { controller, customOrder, documentManager } = setup({ canUpdate: false });
      const ctx = createCtx({ body: { before: 'b' } });

      await expect(controller.move(ctx as any)).resolves.toBe('forbidden');

      expect(documentManager.findOne).not.toHaveBeenCalled();
      expect(customOrder.move).not.toHaveBeenCalled();
    });

    test('Is not found when the entry does not exist', async () => {
      const { controller, customOrder } = setup({ document: null });
      const ctx = createCtx({ body: { before: 'b' } });

      await expect(controller.move(ctx as any)).resolves.toBe('notFound');

      expect(customOrder.move).not.toHaveBeenCalled();
    });

    test('Is forbidden to users who cannot update the entry', async () => {
      const { controller, customOrder } = setup({ canUpdateDocument: false });
      const ctx = createCtx({ body: { before: 'b' } });

      await expect(controller.move(ctx as any)).resolves.toBe('forbidden');

      expect(customOrder.move).not.toHaveBeenCalled();
    });

    test('Moves the entry before another one', async () => {
      const { controller, customOrder, documentManager, populateBuilder, permissionChecker } =
        setup();
      const ctx = createCtx({ body: { before: 'b', locale: 'en' }, query: { populate: '*' } });

      await expect(controller.move(ctx as any)).resolves.toEqual({ data: { documentId: 'a' } });

      expect(permissionChecker.sanitizedQuery.update).toHaveBeenCalledWith({ populate: '*' });
      expect(populateBuilder.populateFromQuery).toHaveBeenCalledWith({
        populate: '*',
        sanitized: true,
      });
      expect(getDocumentLocaleAndStatus).toHaveBeenCalledWith({ before: 'b', locale: 'en' }, MODEL);
      expect(documentManager.findOne).toHaveBeenCalledWith('a', MODEL, {
        populate: { author: true },
        locale: 'en',
      });
      expect(customOrder.refresh).not.toHaveBeenCalled();
      expect(customOrder.move).toHaveBeenCalledWith({
        uid: MODEL,
        documentId: 'a',
        anchorId: 'b',
        placement: 'before',
      });
    });

    test('Moves the entry after another one', async () => {
      const { controller, customOrder } = setup();

      await controller.move(createCtx({ body: { after: 'c' } }) as any);

      expect(customOrder.move).toHaveBeenCalledWith({
        uid: MODEL,
        documentId: 'a',
        anchorId: 'c',
        placement: 'after',
      });
    });
  });
});
