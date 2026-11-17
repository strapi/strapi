import { describe, expect, it, vi } from 'vitest';
import { errors } from '@strapi/utils';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { RoleChangedError } from '../../services/role';
import roleController from '../admin/role';

const setup = () => {
  const service = {
    list: vi.fn(async () => [{ documentId: 'r1', name: 'Editors', usersCount: 2 }]),
    get: vi.fn(async (documentId: string) => ({ documentId, name: 'Editors', permissions: [] })),
    assertExists: vi.fn(async () => {}),
    create: vi.fn(async (input: unknown) => ({
      documentId: 'new',
      name: 'Editors',
      permissions: [{}, {}],
      input,
    })),
    update: vi.fn(async (documentId: string, input: unknown) => ({
      documentId,
      name: 'Editors',
      input,
    })),
    delete: vi.fn(async (documentId: string) => ({
      documentId,
      name: 'Editors',
      movedToDefault: 2,
    })),
    toFile: vi.fn(async (documentId: string) => ({ version: 1, documentId })),
    fromFile: vi.fn(async (file: unknown) => ({
      documentId: 'imported',
      name: 'Imported',
      permissions: [{}, {}, {}],
      file,
    })),
  };

  const eventHub = { emit: vi.fn(async () => {}) };

  const strapi = {
    eventHub,
    plugin(name: string) {
      expect(name).toBe('end-users');

      return {
        service(serviceName: string) {
          expect(serviceName).toBe('role');

          return service;
        },
      };
    },
  } as unknown as Core.Strapi;

  const controller = roleController({ strapi });

  const ctx = ({
    params = {},
    query = {},
    body,
  }: {
    params?: Record<string, string>;
    query?: Record<string, unknown>;
    body?: unknown;
  } = {}) => {
    const context = {
      params,
      query,
      request: { body },
      // The admin who is signed in: the admin routes are not reached without one
      state: { user: { documentId: 'admin-1' } },
      body: undefined as unknown,
      status: undefined as number | undefined,
      created: vi.fn((payload: unknown) => {
        context.body = payload;
      }),
      conflict: vi.fn((message: string, details: unknown) => {
        context.status = 409;
        context.body = { data: null, error: { status: 409, message, details } };
      }),
    };

    return context as typeof context & Koa.Context;
  };

  return { controller, service, eventHub, ctx };
};

const refuses = async (promise: Promise<unknown>, message: RegExp) => {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught
  );

  expect(error).toBeInstanceOf(errors.ValidationError);
  expect((error as Error).message).toMatch(message);
};

describe('role admin controller', () => {
  it('lists the roles with their user counts in { data }', async () => {
    const { controller, service, ctx } = setup();
    const context = ctx();

    await controller.find(context);

    expect(service.list).toHaveBeenCalledTimes(1);
    expect(context.body).toEqual({
      data: [{ documentId: 'r1', name: 'Editors', usersCount: 2 }],
    });
  });

  it('reads one role by documentId', async () => {
    const { controller, service, ctx } = setup();
    const context = ctx({ params: { documentId: 'r1' } });

    await controller.findOne(context);

    expect(service.get).toHaveBeenCalledWith('r1');
    expect(context.body).toEqual({ data: { documentId: 'r1', name: 'Editors', permissions: [] } });
  });

  describe('create', () => {
    it('creates the role from the name, description, two-factor rule and permissions, and answers 201', async () => {
      const { controller, service, ctx } = setup();
      const permissions = [{ action: 'api::note.note.find' }];
      const context = ctx({
        body: { name: 'Editors', description: 'd', requireTwoFactor: true, permissions },
      });

      await controller.create(context);

      expect(service.create).toHaveBeenCalledWith({
        name: 'Editors',
        description: 'd',
        requireTwoFactor: true,
        permissions,
      });
      expect(context.created).toHaveBeenCalledWith({
        data: expect.objectContaining({ documentId: 'new' }),
      });
    });

    it('does not hand the service what a role is not made of: type, ids, anything else', async () => {
      const { controller, service, ctx } = setup();

      await controller.create(
        ctx({ body: { name: 'Pretender', type: 'public', id: 1, documentId: 'x', other: true } })
      );

      const input = (service.create.mock.calls[0] as unknown as [Record<string, unknown>])[0];

      expect(Object.keys(input).filter((key) => input[key] !== undefined)).toEqual(['name']);
    });

    it.each([[undefined], [null], ['role'], [[]]])('refuses a body that is %j', async (body) => {
      const { controller, service, ctx } = setup();

      await refuses(controller.create(ctx({ body })), /A role is an object/);
      expect(service.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('leaves the permissions out when the body has none, so they stay as they are', async () => {
      const { controller, service, ctx } = setup();

      await controller.update(ctx({ params: { documentId: 'r1' }, body: { name: 'Renamed' } }));

      const input = (
        service.update.mock.calls[0] as unknown as [string, Record<string, unknown>]
      )[1];

      expect(service.update).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ name: 'Renamed' })
      );
      expect(input.permissions).toBeUndefined();
    });

    it('passes a diff on, each part defaulting to nothing', async () => {
      const { controller, service, ctx } = setup();
      const create = [{ action: 'a' }];
      const context = ctx({ params: { documentId: 'r1' }, body: { permissions: { create } } });

      await controller.update(context);

      expect(service.update).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ permissions: { create, update: [], delete: [] } })
      );
      expect(context.body).toEqual({ data: expect.objectContaining({ documentId: 'r1' }) });
    });

    it.each([
      ['a list of permissions instead of a diff', [{ action: 'a' }]],
      ['null', null],
      ['a string', 'all'],
    ])('refuses permissions that are %s', async (_label, permissions) => {
      const { controller, service, ctx } = setup();

      await refuses(
        controller.update(ctx({ params: { documentId: 'r1' }, body: { permissions } })),
        /changed by a diff/
      );
      expect(service.update).not.toHaveBeenCalled();
    });

    it('refuses a diff with a key it does not know, rather than saving nothing in silence', async () => {
      const { controller, service, ctx } = setup();

      await refuses(
        controller.update(
          ctx({ params: { documentId: 'r1' }, body: { permissions: { replace: [] } } })
        ),
        /Unknown keys in the permissions diff: replace/
      );
      expect(service.update).not.toHaveBeenCalled();
    });

    it.each(['create', 'update', 'delete'])(
      'refuses a diff whose %s is not a list',
      async (key) => {
        const { controller, service, ctx } = setup();

        await refuses(
          controller.update(
            ctx({ params: { documentId: 'r1' }, body: { permissions: { [key]: { action: 'a' } } } })
          ),
          new RegExp(`permissions.${key} is a list`)
        );
        expect(service.update).not.toHaveBeenCalled();
      }
    );

    it('refuses a body that is not an object', async () => {
      const { controller, ctx } = setup();

      await refuses(controller.update(ctx({ params: { documentId: 'r1' }, body: 'x' })), /object/);
    });

    it.each([
      ['not an object', 'x'],
      ['a list of permissions instead of a diff', { permissions: [{ action: 'a' }] }],
      ['a diff with a key it does not know', { permissions: { replace: [] } }],
    ])(
      'answers 404 for a role that is not there before it judges a body that is %s',
      async (_label, body) => {
        const { controller, service, ctx } = setup();

        service.assertExists.mockRejectedValueOnce(new errors.NotFoundError('Role not found'));

        await expect(
          controller.update(ctx({ params: { documentId: 'nope' }, body }))
        ).rejects.toBeInstanceOf(errors.NotFoundError);
        expect(service.assertExists).toHaveBeenCalledWith('nope');
        expect(service.update).not.toHaveBeenCalled();
      }
    );

    it('hands the service the revision the editor loaded, as it was sent', async () => {
      const { controller, service, ctx } = setup();

      await controller.update(
        ctx({ params: { documentId: 'r1' }, body: { revision: 4, name: 'X' } })
      );

      expect(service.update).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ revision: 4, name: 'X' })
      );
    });

    it('leaves it to the service to refuse a missing revision', async () => {
      const { controller, service, ctx } = setup();

      await controller.update(ctx({ params: { documentId: 'r1' }, body: { name: 'X' } }));

      expect(
        (service.update.mock.calls[0] as unknown as [string, Record<string, unknown>])[1].revision
      ).toBeUndefined();
    });

    it('refuses a part of the diff longer than a role may be, without calling the service', async () => {
      const { controller, service, ctx } = setup();
      const create = Array.from({ length: 5_001 }, () => ({ action: 'a' }));

      await refuses(
        controller.update(
          ctx({ params: { documentId: 'r1' }, body: { revision: 0, permissions: { create } } })
        ),
        /5,000/
      );
      expect(service.update).not.toHaveBeenCalled();
    });

    describe('a stale revision', () => {
      it('is answered 409 with the code ROLE_CHANGED, and reported to nobody', async () => {
        const { controller, service, eventHub, ctx } = setup();
        const context = ctx({ params: { documentId: 'r1' }, body: { revision: 3, name: 'Late' } });

        service.update.mockRejectedValueOnce(new RoleChangedError());

        await controller.update(context);

        expect(context.conflict).toHaveBeenCalledWith(
          expect.stringContaining('changed by someone else'),
          { code: 'ROLE_CHANGED' }
        );
        expect(context.status).toBe(409);
        expect(context.body).toMatchObject({
          data: null,
          error: { status: 409, details: { code: 'ROLE_CHANGED' } },
        });
        expect(eventHub.emit).not.toHaveBeenCalled();
      });

      it('is the only error answered that way: any other goes on to the error handler', async () => {
        const { controller, service, ctx } = setup();
        const context = ctx({ params: { documentId: 'r1' }, body: { revision: 3 } });

        service.update.mockRejectedValueOnce(
          new errors.ValidationError('Permission 0 (a.b.c): no route', {
            errors: [{ path: ['permissions', 'create', 0, 'action'] }],
          })
        );

        await expect(controller.update(context)).rejects.toThrow('Permission 0 (a.b.c): no route');
        expect(context.conflict).not.toHaveBeenCalled();
        expect(context.body).toBeUndefined();
      });
    });
  });

  describe('delete', () => {
    it('deletes by documentId and answers with it and how many users moved to the default role', async () => {
      const { controller, service, ctx } = setup();
      const context = ctx({ params: { documentId: 'r1' } });

      await controller.delete(context);

      // No second argument: there is no reassignTo any more
      expect(service.delete.mock.calls).toEqual([['r1']]);
      // The name is for the event, not for the answer
      expect(context.body).toEqual({ data: { documentId: 'r1', movedToDefault: 2 } });
    });

    it.each([['r2'], [''], [['a', 'b']]])(
      'refuses a reassignTo in the query (%j), which a delete no longer takes, and deletes nothing',
      async (reassignTo) => {
        const { controller, service, eventHub, ctx } = setup();

        await refuses(
          controller.delete(ctx({ params: { documentId: 'r1' }, query: { reassignTo } })),
          /without reassignTo/
        );
        expect(service.delete).not.toHaveBeenCalled();
        expect(eventHub.emit).not.toHaveBeenCalled();
      }
    );

    it('answers 404 for a role that is not there, even with a reassignTo', async () => {
      const { controller, service, eventHub, ctx } = setup();

      service.assertExists.mockRejectedValueOnce(new errors.NotFoundError('Role not found'));

      await expect(
        controller.delete(ctx({ params: { documentId: 'nope' }, query: { reassignTo: 'r2' } }))
      ).rejects.toBeInstanceOf(errors.NotFoundError);
      expect(service.assertExists).toHaveBeenCalledWith('nope');
      expect(service.delete).not.toHaveBeenCalled();
      expect(eventHub.emit).not.toHaveBeenCalled();
    });

    it('does not answer when the service refuses', async () => {
      const { controller, service, ctx } = setup();
      const context = ctx({ params: { documentId: 'r1' } });

      service.delete.mockRejectedValueOnce(
        new errors.ValidationError(
          '6000 users have the Editors role: move its users to other roles first'
        )
      );

      await expect(controller.delete(context)).rejects.toThrow(
        'move its users to other roles first'
      );
      expect(context.body).toBeUndefined();
    });
  });

  describe('the events', () => {
    const admin = 'admin-1';

    it('emits role events after a save, and none when it fails', async () => {
      const { controller, service, eventHub, ctx } = setup();
      const diff = {
        create: [{ action: 'a' }, { action: 'b' }],
        update: [{ documentId: 'p1', conditions: [] }],
        delete: ['p2', 'p3', 'p4'],
      };

      await controller.update(
        ctx({
          params: { documentId: 'r1' },
          body: { revision: 0, name: 'Editors', permissions: diff },
        })
      );

      expect(eventHub.emit).toHaveBeenCalledTimes(1);
      expect(eventHub.emit).toHaveBeenCalledWith('end-users.role.update', {
        adminUserId: admin,
        role: { documentId: 'r1', name: 'Editors' },
        counts: { created: 2, updated: 1, deleted: 3 },
      });

      eventHub.emit.mockClear();
      service.update.mockRejectedValueOnce(
        new errors.ValidationError('Permission 0 (a): no route')
      );

      await expect(
        controller.update(
          ctx({ params: { documentId: 'r1' }, body: { revision: 1, permissions: diff } })
        )
      ).rejects.toThrow('no route');

      expect(eventHub.emit).not.toHaveBeenCalled();
    });

    it('counts a save with no diff as no permissions touched', async () => {
      const { controller, eventHub, ctx } = setup();

      await controller.update(
        ctx({ params: { documentId: 'r1' }, body: { revision: 0, name: 'X' } })
      );

      expect(eventHub.emit).toHaveBeenCalledWith(
        'end-users.role.update',
        expect.objectContaining({ counts: { created: 0, updated: 0, deleted: 0 } })
      );
    });

    it('emits create with the rows the role was made with', async () => {
      const { controller, eventHub, ctx } = setup();

      await controller.create(
        ctx({ body: { name: 'Editors', permissions: [{ action: 'a' }, { action: 'b' }] } })
      );

      expect(eventHub.emit).toHaveBeenCalledTimes(1);
      expect(eventHub.emit).toHaveBeenCalledWith('end-users.role.create', {
        adminUserId: admin,
        role: { documentId: 'new', name: 'Editors' },
        counts: { created: 2, updated: 0, deleted: 0 },
      });
    });

    it('emits import with the rows the file made the role from', async () => {
      const { controller, eventHub, ctx } = setup();

      await controller.import(ctx({ body: { version: 1 } }));

      expect(eventHub.emit).toHaveBeenCalledTimes(1);
      expect(eventHub.emit).toHaveBeenCalledWith('end-users.role.import', {
        adminUserId: admin,
        role: { documentId: 'imported', name: 'Imported' },
        counts: { created: 3, updated: 0, deleted: 0 },
      });
    });

    it('emits delete with the name of the role it deleted and how many users moved', async () => {
      const { controller, eventHub, ctx } = setup();

      await controller.delete(ctx({ params: { documentId: 'r1' } }));

      expect(eventHub.emit).toHaveBeenCalledTimes(1);
      expect(eventHub.emit).toHaveBeenCalledWith('end-users.role.delete', {
        adminUserId: admin,
        role: { documentId: 'r1', name: 'Editors' },
        counts: { movedToDefault: 2 },
      });
    });

    it('emits nothing when a create, a delete or an import is refused, and for a read or an export', async () => {
      const { controller, service, eventHub, ctx } = setup();

      service.create.mockRejectedValueOnce(new errors.ValidationError('A role needs a name'));
      service.delete.mockRejectedValueOnce(new errors.ValidationError('Public cannot be deleted'));
      service.fromFile.mockRejectedValueOnce(new errors.ValidationError('Not a role file'));

      await expect(controller.create(ctx({ body: {} }))).rejects.toThrow();
      await expect(controller.delete(ctx({ params: { documentId: 'r1' } }))).rejects.toThrow();
      await expect(controller.import(ctx({ body: {} }))).rejects.toThrow();
      await controller.find(ctx());
      await controller.findOne(ctx({ params: { documentId: 'r1' } }));
      await controller.export(ctx({ params: { documentId: 'r1' } }));

      expect(eventHub.emit).not.toHaveBeenCalled();
    });

    it('says nothing of the rows, or of anybody but the admin', async () => {
      const { controller, eventHub, ctx } = setup();

      await controller.create(
        ctx({
          body: {
            name: 'Editors',
            permissions: [{ action: 'secret.route.find', conditions: [{ name: 'c' }] }],
          },
        })
      );

      const [, payload] = eventHub.emit.mock.calls[0] as unknown as [
        string,
        Record<string, unknown>,
      ];

      expect(Object.keys(payload).sort()).toEqual(['adminUserId', 'counts', 'role']);
      expect(JSON.stringify(payload)).not.toMatch(/secret\.route|conditions/);
    });
  });

  describe('export and import', () => {
    it('exports the role file as the body itself, not wrapped in { data }', async () => {
      const { controller, service, ctx } = setup();
      const context = ctx({ params: { documentId: 'r1' } });

      await controller.export(context);

      expect(service.toFile).toHaveBeenCalledWith('r1');
      expect(context.body).toEqual({ version: 1, documentId: 'r1' });
    });

    it('imports the request body as the file, and answers 201 with the new role', async () => {
      const { controller, service, ctx } = setup();
      const file = { version: 1, role: { name: 'Editors' }, permissions: [] };
      const context = ctx({ body: file });

      await controller.import(context);

      expect(service.fromFile).toHaveBeenCalledWith(file);
      expect(context.created).toHaveBeenCalledWith({
        data: expect.objectContaining({ documentId: 'imported' }),
      });
    });

    it('leaves checking the file to the service: whatever the body is, it is the one that judges', async () => {
      const { controller, service, ctx } = setup();

      await controller.import(ctx({ body: 'not a file' }));

      expect(service.fromFile).toHaveBeenCalledWith('not a file');
    });
  });
});
