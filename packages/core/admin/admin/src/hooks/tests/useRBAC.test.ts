import { renderHook, server, waitFor } from '@tests/utils';
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
      useRBAC([
        {
          id: 1,
          actionParameters: {},
          action: 'apples.something.unacceptable',
          subject: null,
          conditions: [],
          properties: {},
        },
      ])
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.allowedActions).toMatchInlineSnapshot(`
      {
        "canUnacceptable": false,
      }
    `);
  });

  describe('checking against the server if there are conditions in the permissions', () => {
    it.skip('should return truthy values if the permissions condition passes', async () => {
      const { result } = renderHook(() => {
        return useRBAC({
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
        });
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

      const { result } = renderHook(
        () => {
          return useRBAC({
            create: [
              {
                action: 'admin::roles.create',
                subject: null,
              },
            ],
          });
        },
        {
          providerOptions: {
            permissions: () => [
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
        }
      );

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

          return res(
            ctx.json({
              // @ts-expect-error – shhh
              data: permissions.map(({ action }) =>
                action === 'admin::roles.create' ? false : true
              ),
            })
          );
        })
      );

      const { result } = renderHook(
        () => {
          return useRBAC([
            {
              action: 'admin::roles.create',
              subject: null,
            },
            {
              action: 'admin::roles.update',
              subject: null,
            },
          ]);
        },
        {
          providerOptions: {
            permissions: () => [
              {
                id: 1,
                actionParameters: {},
                action: 'admin::roles.create',
                subject: null,
                conditions: ['willFail'],
                properties: {},
              },
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
        }
      );

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
