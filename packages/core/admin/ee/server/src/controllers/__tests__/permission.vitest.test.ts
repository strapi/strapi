import { beforeEach, describe, expect, test, vi } from 'vitest';

import permissionController from '../permission';

const SETTINGS = [
  {
    displayName: 'Access the Email Settings page',
    category: 'email',
    subCategory: 'general',
    action: 'plugin::email.settings.read',
  },
  {
    displayName: 'Read',
    category: 'audit logs',
    subCategory: 'options',
    action: 'admin::audit-logs.read',
  },
  {
    displayName: 'Export',
    category: 'audit logs',
    subCategory: 'options',
    action: 'admin::audit-logs.export',
  },
];

vi.mock('../../../../../server/src/controllers/permission', () => ({
  default: {
    getAll: vi.fn(async (ctx: { body?: unknown }) => {
      ctx.body = {
        data: {
          conditions: [],
          sections: { collectionTypes: {}, singleTypes: {}, plugins: [], settings: SETTINGS },
        },
      };
    }),
  },
}));

const mockStrapi = ({
  licensed,
  auditLogsEnabled,
}: {
  licensed: boolean;
  auditLogsEnabled?: boolean;
}) => {
  global.strapi = {
    ee: { features: { isEnabled: vi.fn((name: string) => licensed && name === 'audit-logs') } },
    config: {
      get: vi.fn((path: string, defaultValue?: unknown) =>
        path === 'admin.auditLogs.enabled' ? (auditLogsEnabled ?? defaultValue) : defaultValue
      ),
    },
  } as any;
};

const getSettings = async () => {
  const ctx: { body?: any } = {};

  await permissionController.getAll(ctx as any);

  return ctx.body.data.sections.settings;
};

describe('EE permission controller - getAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('flags the audit-log actions when the license includes them but the config disables them', async () => {
    mockStrapi({ licensed: true, auditLogsEnabled: false });

    const settings = await getSettings();

    expect(settings).toEqual([
      SETTINGS[0],
      { ...SETTINGS[1], disabledByConfig: true },
      { ...SETTINGS[2], disabledByConfig: true },
    ]);
  });

  test.each([
    { licensed: true, auditLogsEnabled: true },
    { licensed: true, auditLogsEnabled: undefined },
    { licensed: false, auditLogsEnabled: false },
  ])(
    'returns the CE sections unchanged (licensed: $licensed, config: $auditLogsEnabled)',
    async (options) => {
      mockStrapi(options);

      const settings = await getSettings();

      expect(settings).toEqual(SETTINGS);
    }
  );
});
