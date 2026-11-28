import { describe, expect, it, vi } from 'vitest';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PROFILE_UID, USER_UID } from '../../constants';
import { ConditionsUpdatingError } from '../../services/condition';
import conditionController from '../admin/condition';

const ARTICLE = 'api::article.article';
const READ = 'plugin::content-manager.explorer.read';

/** The controller leaves the condition to the service: any object is passed on as it is */
const CONDITION = { version: 2, slug: 'mine', displayName: 'Mine' };
const BODY = { condition: CONDITION, subject: ARTICLE, userDocumentId: 'user-1', inputs: {} };

/** What `writeFile` answers: the condition as the list will show it after the restart */
const WRITTEN = {
  data: {
    name: 'api::mine',
    displayName: 'Mine',
    subjects: [ARTICLE],
    source: 'builder',
    usedBy: 0,
    editable: true,
  },
};

const LIST = [
  {
    name: 'plugin::end-users.is-owner',
    displayName: 'Is owner',
    subjects: [ARTICLE],
    source: 'builtin',
    usedBy: 3,
    editable: false,
  },
];

/**
 * Fakes of what the controller reaches: the condition service, and the admin permissions manager,
 * which answers per content type from what the test says the admin can read.
 */
const setup = (readable: Record<string, object | false | null> = {}) => {
  const listForAdmin = vi.fn(async () => LIST);
  const preview = vi.fn(async () => ({ matching: 12, total: 340 }));
  const writeFile = vi.fn(async () => WRITTEN);
  const removeFile = vi.fn(async () => undefined);
  const status = vi.fn(() => ({ isUpdating: false }));
  const service = vi.fn(() => ({ listForAdmin, preview, writeFile, removeFile, status }));
  const plugin = vi.fn(() => ({ service }));
  // One per content type, so a test sees which type a field was checked against
  const validators: Record<string, ReturnType<typeof vi.fn>> = {};
  const createPermissionsManager = vi.fn(({ model }: { model: string }) => {
    // An admin who may not read the type has no entry for it
    const scope = model in readable ? readable[model] : false;

    validators[model] = vi.fn(async () => true);

    // Its query would let everything through: only `isAllowed` keeps the admin out
    return {
      isAllowed: scope !== false,
      getQuery: vi.fn(() => (scope === false ? {} : scope)),
      validateQuery: validators[model],
    };
  });
  const adminService = vi.fn(() => ({ createPermissionsManager }));
  const emit = vi.fn();
  const strapi = {
    plugin,
    service: adminService,
    eventHub: { emit },
  } as unknown as Core.Strapi;
  const userAbility = { can: vi.fn() };

  const ctxWith = (body: unknown = BODY, params: Record<string, string> = {}) =>
    ({
      state: { userAbility, user: { documentId: 'admin-1' } },
      request: { body },
      params,
      body: undefined,
      created: vi.fn(),
      conflict: vi.fn(),
    }) as unknown as Koa.Context;

  return {
    controller: conditionController({ strapi }),
    listForAdmin,
    preview,
    writeFile,
    removeFile,
    status,
    service,
    plugin,
    adminService,
    createPermissionsManager,
    validators,
    emit,
    userAbility,
    ctxWith,
  };
};

describe('condition controller', () => {
  describe('find', () => {
    it('answers the conditions from the condition service', async () => {
      const { controller, listForAdmin, plugin, service, ctxWith } = setup();
      const ctx = ctxWith();

      await controller.find(ctx);

      expect(plugin).toHaveBeenCalledWith('end-users');
      expect(service).toHaveBeenCalledWith('condition');
      expect(listForAdmin).toHaveBeenCalledTimes(1);
      expect(ctx.body).toEqual({ data: LIST });
    });
  });

  describe('preview', () => {
    it("passes the admin's Content Manager read query on the subject and on the user type to the service", async () => {
      const subjectQuery = { createdBy: { id: 1 } };
      const userQuery = { $or: [{ emailVerified: { $eq: true } }] };
      const { controller, preview, createPermissionsManager, adminService, userAbility, ctxWith } =
        setup({ [ARTICLE]: subjectQuery, [USER_UID]: userQuery });
      const ctx = ctxWith();

      await controller.preview(ctx);

      expect(adminService).toHaveBeenCalledWith('admin::permission');
      expect(createPermissionsManager).toHaveBeenCalledWith({
        ability: userAbility,
        action: READ,
        model: ARTICLE,
      });
      expect(createPermissionsManager).toHaveBeenCalledWith({
        ability: userAbility,
        action: READ,
        model: USER_UID,
      });
      expect(preview).toHaveBeenCalledWith(BODY, {
        subjectQuery,
        userQuery,
        validateSubject: expect.any(Function),
        validateUser: expect.any(Function),
        validateProfile: expect.any(Function),
        profileQuery: expect.any(Function),
      });
      expect(ctx.body).toEqual({ data: { matching: 12, total: 340 } });
    });

    it('hands the service the values of the inputs, and refuses inputs that are not an object', async () => {
      const { controller, preview, ctxWith } = setup({ [ARTICLE]: {}, [USER_UID]: {} });

      await controller.preview(ctxWith({ ...BODY, inputs: { pick: 'title' } }));

      expect(preview).toHaveBeenCalledWith(
        { ...BODY, inputs: { pick: 'title' } },
        expect.anything()
      );

      await expect(controller.preview(ctxWith({ ...BODY, inputs: 'title' }))).rejects.toMatchObject(
        {
          name: 'ValidationError',
        }
      );
    });

    it('looks the admin`s read access to profiles up only when the service asks, and answers 403 when they have none', async () => {
      const { controller, preview, createPermissionsManager, ctxWith } = setup({
        [ARTICLE]: {},
        [USER_UID]: {},
      });

      await controller.preview(ctxWith());

      expect(createPermissionsManager).not.toHaveBeenCalledWith(
        expect.objectContaining({ model: PROFILE_UID })
      );

      const [, scope] = preview.mock.calls[0] as unknown as [
        unknown,
        { validateProfile: (query: object) => Promise<unknown> },
      ];

      await expect(scope.validateProfile({ fields: ['nickname'] })).rejects.toMatchObject({
        name: 'PolicyError',
        message: expect.stringContaining('profiles'),
      });
    });

    it('hands the service what each manager says the admin may read: the subject`s for the subject, the end user`s for the user', async () => {
      const { controller, preview, validators, ctxWith } = setup({ [ARTICLE]: {}, [USER_UID]: {} });

      await controller.preview(ctxWith());

      const [, scope] = preview.mock.calls[0] as unknown as [
        unknown,
        {
          validateSubject: (query: object) => Promise<unknown>;
          validateUser: (query: object) => Promise<unknown>;
        },
      ];
      const filters = { filters: { title: { $eq: 'x' } } };
      const fields = { fields: ['email'] };

      validators[ARTICLE].mockResolvedValueOnce('subject answer');
      validators[USER_UID].mockResolvedValueOnce('user answer');

      // The Content Manager's own check, as it asks it of a list: the type as subject, and reading
      await expect(scope.validateSubject(filters)).resolves.toBe('subject answer');
      await expect(scope.validateUser(fields)).resolves.toBe('user answer');
      expect(validators[ARTICLE]).toHaveBeenCalledWith(filters, { subject: ARTICLE, action: READ });
      expect(validators[USER_UID]).toHaveBeenCalledWith(fields, {
        subject: USER_UID,
        action: READ,
      });
      expect(validators[ARTICLE]).toHaveBeenCalledTimes(1);
      expect(validators[USER_UID]).toHaveBeenCalledTimes(1);
    });

    it('passes on an unrestricted admin, whose query is empty', async () => {
      const { controller, preview, ctxWith } = setup({ [ARTICLE]: {}, [USER_UID]: {} });

      await controller.preview(ctxWith());

      expect(preview).toHaveBeenCalledWith(
        BODY,
        expect.objectContaining({ subjectQuery: {}, userQuery: {} })
      );
    });

    it.each([
      ['the subject', { [USER_UID]: {} }],
      ['the user type', { [ARTICLE]: {} }],
      ['both', {}],
      // Allowed, yet with no query to count with: no permission either
      ['a query the admin does not have', { [ARTICLE]: null, [USER_UID]: {} }],
    ])(
      'answers 403 without Content Manager read on the subject or the user type (not on %s)',
      async (_, readable) => {
        const { controller, preview, ctxWith } = setup(readable);

        await expect(controller.preview(ctxWith())).rejects.toMatchObject({
          name: 'PolicyError',
          message: expect.stringContaining('Content Manager'),
        });
        expect(preview).not.toHaveBeenCalled();
      }
    );

    it.each([
      ['no body', null],
      ['a list', []],
      ['no subject', { ...BODY, subject: undefined }],
      ['a subject that is not a string', { ...BODY, subject: [ARTICLE] }],
      ['an empty subject', { ...BODY, subject: '' }],
      ['no user', { ...BODY, userDocumentId: undefined }],
      ['a user that is not a string', { ...BODY, userDocumentId: 3 }],
    ])('refuses %s with a 400, and asks nobody', async (_, body) => {
      const { controller, preview, createPermissionsManager, ctxWith } = setup({
        [ARTICLE]: {},
        [USER_UID]: {},
      });

      await expect(controller.preview(ctxWith(body))).rejects.toMatchObject({
        name: 'ValidationError',
      });
      expect(createPermissionsManager).not.toHaveBeenCalled();
      expect(preview).not.toHaveBeenCalled();
    });

    it('leaves the condition to the service: an admin who cannot read is told nothing about it', async () => {
      const { controller, preview, ctxWith } = setup({});

      await expect(
        controller.preview(ctxWith({ ...BODY, condition: { not: 'a condition' } }))
      ).rejects.toMatchObject({ name: 'PolicyError' });
      expect(preview).not.toHaveBeenCalled();
    });
  });

  describe('status', () => {
    it('answers whether a write waits for its restart', async () => {
      const { controller, status, ctxWith } = setup();
      const ctx = ctxWith();

      status.mockReturnValueOnce({ isUpdating: true });
      await controller.status(ctx);

      expect(ctx.body).toEqual({ data: { isUpdating: true } });
    });
  });

  describe('writes', () => {
    const MINE = { ...CONDITION, slug: 'mine' };

    it('creates from the body, which is the service`s to check, answers 201 and emits after the write', async () => {
      const { controller, writeFile, emit, ctxWith } = setup();
      const ctx = ctxWith(MINE);

      await controller.create(ctx);

      expect(writeFile).toHaveBeenCalledWith(MINE, { slug: 'mine', create: true });
      expect(ctx.created).toHaveBeenCalledWith(WRITTEN);
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith('end-users.condition.create', {
        adminUserId: 'admin-1',
        condition: { name: 'api::mine' },
      });
      // After the write resolved, so never for one that failed
      expect(writeFile.mock.invocationCallOrder[0]).toBeLessThan(emit.mock.invocationCallOrder[0]);
    });

    it.each([
      ['no body', null, ''],
      ['a body without a slug', {}, ''],
      ['a slug that is not a text', { slug: 3 }, ''],
    ])('hands a create with %s to the service, which refuses it', async (_, body, slug) => {
      const { controller, writeFile, ctxWith } = setup();

      await controller.create(ctxWith(body));

      expect(writeFile).toHaveBeenCalledWith(body, { slug, create: true });
    });

    it('updates the condition the URL names, answers 200 and emits after the write', async () => {
      const { controller, writeFile, emit, ctxWith } = setup();
      const ctx = ctxWith(MINE, { slug: 'mine' });

      const updated = {
        ...WRITTEN,
        data: { ...WRITTEN.data, usedBy: 2 },
        warnings: { removedInputs: [{ name: 'tag', roles: ['Editor'] }] },
      };

      writeFile.mockResolvedValueOnce(updated);
      await controller.update(ctx);

      // The URL's slug, never the body's
      expect(writeFile).toHaveBeenCalledWith(MINE, { slug: 'mine', create: false });
      expect(ctx.body).toEqual(updated);
      expect(ctx.created).not.toHaveBeenCalled();
      expect(emit).toHaveBeenCalledWith('end-users.condition.update', {
        adminUserId: 'admin-1',
        condition: { name: 'api::mine' },
      });
    });

    it('takes the slug of an update from the URL even when the body names another', async () => {
      const { controller, writeFile, ctxWith } = setup();

      await controller.update(ctxWith({ ...MINE, slug: 'other' }, { slug: 'mine' }));

      expect(writeFile).toHaveBeenCalledWith(expect.anything(), { slug: 'mine', create: false });
    });

    it('deletes the condition the URL names, answers its name and emits after the removal', async () => {
      const { controller, removeFile, emit, ctxWith } = setup();
      const ctx = ctxWith(undefined, { slug: 'mine' });

      await controller.delete(ctx);

      expect(removeFile).toHaveBeenCalledWith('mine');
      expect(ctx.body).toEqual({ data: { name: 'api::mine' } });
      expect(emit).toHaveBeenCalledWith('end-users.condition.delete', {
        adminUserId: 'admin-1',
        condition: { name: 'api::mine' },
      });
      expect(removeFile.mock.invocationCallOrder[0]).toBeLessThan(emit.mock.invocationCallOrder[0]);
    });

    it('emits no condition event when a write fails, and passes the failure on', async () => {
      const { controller, writeFile, removeFile, emit, ctxWith } = setup();
      const failure = new Error('refused');

      writeFile.mockRejectedValue(failure);
      removeFile.mockRejectedValue(failure);

      await expect(controller.create(ctxWith(MINE))).rejects.toBe(failure);
      await expect(controller.update(ctxWith(MINE, { slug: 'mine' }))).rejects.toBe(failure);
      await expect(controller.delete(ctxWith(undefined, { slug: 'mine' }))).rejects.toBe(failure);

      expect(emit).not.toHaveBeenCalled();
    });

    it('answers 409 while a write waits for its restart, writes nothing and emits nothing', async () => {
      const { controller, writeFile, removeFile, emit, ctxWith } = setup();
      const waiting = new ConditionsUpdatingError();

      writeFile.mockRejectedValue(waiting);
      removeFile.mockRejectedValue(waiting);

      const answers = [
        ctxWith(MINE),
        ctxWith(MINE, { slug: 'mine' }),
        ctxWith(undefined, { slug: 'mine' }),
      ];

      await controller.create(answers[0]);
      await controller.update(answers[1]);
      await controller.delete(answers[2]);

      for (const ctx of answers) {
        expect(ctx.conflict).toHaveBeenCalledWith(waiting.message, { code: 'CONDITIONS_UPDATING' });
        expect(ctx.created).not.toHaveBeenCalled();
        expect(ctx.body).toBeUndefined();
      }

      expect(emit).not.toHaveBeenCalled();
    });
  });
});
