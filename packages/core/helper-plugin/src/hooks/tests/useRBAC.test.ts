import { waitFor } from '@testing-library/react';
import { renderHook, server } from '@tests/utils';
import { rest } from 'msw';

import { useRBAC } from '../useRBAC';

describe('useRBAC', () => {
  it('should return by default falsey values and if the permissions match then it should return truthy values', async () => {
    const { result } = renderHook(() =>
      useRBAC({
        create: [
          {
            id: 1,
            actionParameters: {},
            action: 'admin::roles.create',
            subject: null,
            conditions: [],
            properties: {},
          },
        ],
        delete: [
          {
            id: 2,
            actionParameters: {},
            action: 'admin::roles.delete',
            subject: null,
            conditions: [],
            properties: {},
          },
        ],
        read: [
          {
            id: 3,
            actionParameters: {},
            action: 'admin::roles.read',
            subject: null,
            conditions: [],
            properties: {},
          },
        ],
        update: [
          {
            id: 4,
            actionParameters: {},
            action: 'admin::roles.update',
            subject: null,
            conditions: [],
            properties: {},
          },
        ],
      })
    );

    expect(result.current.allowedActions).toMatchInlineSnapshot(`
      {
        "canCreate": false,
        "canDelete": false,
        "canRead": false,
        "canUpdate": false,
      }
    `);

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.allowedActions).toMatchInlineSnapshot(`
      {
        "canCreate": true,
        "canDelete": true,
        "canRead": true,
        "canUpdate": true,
      }
    `);
  });

  it('should return falsey values if after matching the permissions and no match is found', async () => {
    const { result } = renderHook(() =>
      useRBAC({
        create: [
          {
            id: 1,
            actionParameters: {},
            action: 'admin::something.create',
            subject: null,
            conditions: [],
            properties: {},
          },
        ],
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.allowedActions).toMatchInlineSnapshot(`
      {
        "canCreate": false,
      }
    `);
  });

  describe('checking against the custom permissions argument', () => {
    it('should return truthy values if there are matching permissions', async () => {
      const { result } = renderHook(() => {
        return useRBAC(
          {
            create: [
              {
                id: 1,
                actionParameters: {},
                action: 'admin::roles.create',
                subject: null,
                conditions: [],
                properties: {},
              },
            ],
          },
          [
            {
              id: 2,
              actionParameters: {},
              action: 'admin::roles.create',
              subject: null,
              conditions: [],
              properties: {},
            },
          ]
        );
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.allowedActions).toMatchInlineSnapshot(`
        {
          "canCreate": true,
        }
      `);
    });

    it('should return falsey values if there are no matching permissions', async () => {
      const { result } = renderHook(() => {
        return useRBAC(
          {
            create: [
              {
                id: 1,
                actionParameters: {},
                action: 'admin::something.create',
                subject: null,
                conditions: [],
                properties: {},
              },
            ],
          },
          [
            {
              id: 2,
              actionParameters: {},
              action: 'admin::roles.create',
              subject: null,
              conditions: [],
              properties: {},
            },
          ]
        );
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.allowedActions).toMatchInlineSnapshot(`
        {
          "canCreate": false,
        }
      `);
    });

    /**
     * There may be cases where permissionsToCheck and the passed Permissions update at different times
     * so therefore we can't just depend on permissionsToCheck to recalculate the permissions but we also
     * need to recalculate the permissions when the permissions argument changes.
     */
    it('should recalculate the permissions the permissions argument changes', async () => {
      const { result, rerender } = renderHook(
        ({ permissions, permissionsToCheck }) => {
          return useRBAC(permissionsToCheck, permissions);
        },
        {
          initialProps: {
            permissionsToCheck: {
              create: [
                {
                  id: 1,
                  actionParameters: {},
                  action: 'plugin::content-manager.explorer.update',
                  subject: 'api::about.about',
                  properties: {},
                  conditions: [],
                },
              ],
            },
            permissions: [
              {
                id: 2,
                actionParameters: {},
                action: 'plugin::content-manager.explorer.update',
                subject: 'api::about.about',
                properties: {},
                conditions: [],
              },
            ],
          },
        }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.allowedActions).toMatchInlineSnapshot(`
        {
          "canCreate": true,
        }
      `);

      rerender({
        permissionsToCheck: {
          create: [
            {
              id: 1,
              actionParameters: {},
              action: 'plugin::content-manager.explorer.update',
              subject: 'api::term.term',
              properties: {},
              conditions: [],
            },
          ],
        },
        permissions: [
          {
            id: 2,
            actionParameters: {},
            action: 'plugin::content-manager.explorer.update',
            subject: 'api::about.about',
            properties: {},
            conditions: [],
          },
        ],
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.allowedActions).toMatchInlineSnapshot(`
        {
          "canCreate": false,
        }
      `);

      rerender({
        permissionsToCheck: {
          create: [
            {
              id: 1,
              actionParameters: {},
              action: 'plugin::content-manager.explorer.update',
              subject: 'api::term.term',
              properties: {},
              conditions: [],
            },
          ],
        },
        permissions: [
          {
            id: 2,
            actionParameters: {},
            action: 'plugin::content-manager.explorer.update',
            subject: 'api::term.term',
            properties: {},
            conditions: [],
          },
        ],
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.allowedActions).toMatchInlineSnapshot(`
        {
          "canCreate": true,
        }
      `);
    });
  });

  describe('checking against the server if there are conditions in the permissions', () => {
    it('should return truthy values if the permissions condition passes', async () => {
      const { result } = renderHook(() => {
        return useRBAC(
          {
            create: [
              {
                id: 1,
                actionParameters: {},
                action: 'admin::roles.create',
                subject: null,
                conditions: ['willPass'],
                properties: {},
              },
            ],
          },
          [
            {
              id: 2,
              actionParameters: {},
              action: 'admin::roles.create',
              subject: null,
              conditions: ['willPass'],
              properties: {},
            },
          ]
        );
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.allowedActions).toMatchInlineSnapshot(`
        {
          "canCreate": true,
        }
      `);
    });

    it("should return falsey values if the permissions condition doesn't pass", async () => {
      server.use(
        rest.post('/admin/permissions/check', (req, res, ctx) => res(ctx.json({ data: [false] })))
      );

      const { result } = renderHook(() => {
        return useRBAC(
          {
            create: [
              {
                id: 1,
                actionParameters: {},
                action: 'admin::roles.create',
                subject: null,
                conditions: ['willFail'],
                properties: {},
              },
            ],
          },
          [
            {
              id: 2,
              actionParameters: {},
              action: 'admin::roles.create',
              subject: null,
              conditions: ['willFail'],
              properties: {},
            },
          ]
        );
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.allowedActions).toMatchInlineSnapshot(`
        {
          "canCreate": false,
        }
      `);

      server.restoreHandlers();
    });

    it('should check all the conditions and return their values in order', async () => {
      server.use(
        rest.post('/admin/permissions/check', async (req, res, ctx) => {
          const { permissions } = await req.json();

          const [{ action }] = permissions;

          if (action === 'admin::roles.create') {
            return res(ctx.json({ data: [false] }));
          }

          return res(ctx.json({ data: [true] }));
        })
      );

      const { result } = renderHook(() => {
        return useRBAC(
          {
            create: [
              {
                id: 1,
                actionParameters: {},
                action: 'admin::roles.create',
                subject: null,
                conditions: ['willFail'],
                properties: {},
              },
            ],
            update: [
              {
                id: 2,
                actionParameters: {},
                action: 'admin::roles.update',
                subject: null,
                conditions: ['willPass'],
                properties: {},
              },
            ],
          },
          [
            {
              id: 3,
              actionParameters: {},
              action: 'admin::roles.create',
              subject: null,
              conditions: ['willFail'],
              properties: {},
            },
            {
              id: 4,
              actionParameters: {},
              action: 'admin::roles.update',
              subject: null,
              conditions: ['willPass'],
              properties: {},
            },
          ]
        );
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.allowedActions).toMatchInlineSnapshot(`
        {
          "canCreate": false,
          "canUpdate": true,
        }
      `);

      server.restoreHandlers();
    });
  });
});
