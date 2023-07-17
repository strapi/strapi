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
            action: 'admin::roles.create',
            subject: null,
          },
        ],
        delete: [
          {
            action: 'admin::roles.delete',
            subject: null,
          },
        ],
        read: [
          {
            action: 'admin::roles.read',
            subject: null,
          },
        ],
        update: [
          {
            action: 'admin::roles.update',
            subject: null,
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
            action: 'admin::something.create',
            subject: null,
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
                action: 'admin::roles.create',
                subject: null,
              },
            ],
          },
          [
            {
              action: 'admin::roles.create',
              subject: null,
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
                action: 'admin::something.create',
                subject: null,
              },
            ],
          },
          [
            {
              action: 'admin::roles.create',
              subject: null,
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
                  action: 'plugin::content-manager.explorer.update',
                  subject: 'api::about.about',
                },
              ],
            },
            permissions: [
              {
                action: 'plugin::content-manager.explorer.update',
                subject: 'api::about.about',
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
              action: 'plugin::content-manager.explorer.update',
              subject: 'api::term.term',
            },
          ],
        },
        permissions: [
          {
            action: 'plugin::content-manager.explorer.update',
            subject: 'api::about.about',
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
              action: 'plugin::content-manager.explorer.update',
              subject: 'api::term.term',
            },
          ],
        },
        permissions: [
          {
            action: 'plugin::content-manager.explorer.update',
            subject: 'api::term.term',
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
                action: 'admin::roles.create',
                subject: null,
                conditions: ['willPass'],
              },
            ],
          },
          [
            {
              action: 'admin::roles.create',
              subject: null,
              conditions: ['willPass'],
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
                action: 'admin::roles.create',
                subject: null,
                conditions: ['willFail'],
              },
            ],
          },
          [
            {
              action: 'admin::roles.create',
              subject: null,
              conditions: ['willFail'],
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
                action: 'admin::roles.create',
                subject: null,
                conditions: ['willFail'],
              },
            ],
            update: [
              {
                action: 'admin::roles.update',
                subject: null,
                conditions: ['willPass'],
              },
            ],
          },
          [
            {
              action: 'admin::roles.create',
              subject: null,
              conditions: ['willFail'],
            },
            {
              action: 'admin::roles.update',
              subject: null,
              conditions: ['willPass'],
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
