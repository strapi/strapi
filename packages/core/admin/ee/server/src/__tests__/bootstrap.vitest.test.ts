import { beforeEach, describe, expect, test, vi } from 'vitest';

import bootstrap from '../bootstrap';
import actions from '../config/admin-actions';

const { registerMany, persistTablesWithPrefix, seatEnforcementWorkflow } = vi.hoisted(() => ({
  registerMany: vi.fn(),
  persistTablesWithPrefix: vi.fn(),
  seatEnforcementWorkflow: vi.fn(),
}));

vi.mock('../../../../server/src/bootstrap', () => ({ default: vi.fn() }));

vi.mock('../utils', () => ({
  getService: vi.fn((name: string) => {
    switch (name) {
      case 'permission':
        return { actionProvider: { registerMany } };
      case 'persist-tables':
        return { persistTablesWithPrefix };
      case 'seat-enforcement':
        return { seatEnforcementWorkflow };
      default:
        throw new Error(`Unexpected service ${name}`);
    }
  }),
}));

const mockStrapi = ({
  features,
  auditLogsEnabled,
}: {
  features: string[];
  auditLogsEnabled?: boolean;
}) => {
  global.strapi = {
    ee: { features: { isEnabled: vi.fn((name: string) => features.includes(name)) } },
    config: {
      get: vi.fn((path: string, defaultValue?: unknown) => {
        if (path === 'admin.auditLogs.enabled') {
          return auditLogsEnabled ?? defaultValue;
        }

        return defaultValue;
      }),
    },
  } as any;
};

describe('EE admin bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('audit logs permission actions', () => {
    test('registers the actions when the feature is licensed and the config is not set', async () => {
      mockStrapi({ features: ['audit-logs'] });

      await bootstrap({});

      expect(registerMany).toHaveBeenCalledWith(actions.auditLogs);
    });

    // A config disable must not unregister the actions: the boot cleanup would delete every
    // role and admin token grant for them
    test('registers the actions when admin.auditLogs.enabled is false', async () => {
      mockStrapi({ features: ['audit-logs'], auditLogsEnabled: false });

      await bootstrap({});

      expect(registerMany).toHaveBeenCalledWith(actions.auditLogs);
    });

    test('does not register the actions when the feature is not licensed', async () => {
      mockStrapi({ features: [], auditLogsEnabled: true });

      await bootstrap({});

      expect(registerMany).not.toHaveBeenCalledWith(actions.auditLogs);
    });
  });
});
