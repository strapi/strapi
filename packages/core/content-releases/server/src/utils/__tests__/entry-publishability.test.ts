import { errors, yup } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { getActionValidity, getPublishabilityForActions, getValidityForActions } from '../index';

const contentTypeUid = 'api::article.article' as const;
const reviewStage = { id: 1, name: 'Review' };
const doneStage = { id: 2, name: 'Done' };

const invalidTitleError = () =>
  new errors.ValidationError('title must be defined.', {
    errors: [
      {
        path: ['title'],
        message: 'title must be defined.',
        name: 'ValidationError',
        value: 'secret',
      },
    ],
  });

const buildStrapi = ({
  config = { get: (_key: string, defaultValue: unknown) => defaultValue },
  validate = jest.fn().mockResolvedValue({}),
  workflowsService = { getAssignedWorkflow: jest.fn().mockResolvedValue(null) },
  populateBuilder = jest.fn(() => ({ populateDeep: () => ({ build: async () => ({}) }) })),
  findOne = jest.fn(),
  // No entry has a published version
  findPublished = jest.fn().mockResolvedValue(null),
}: {
  config?: { get: (key: string, defaultValue: unknown) => unknown };
  validate?: jest.Mock;
  workflowsService?: { getAssignedWorkflow: jest.Mock } | undefined;
  populateBuilder?: jest.Mock;
  findOne?: jest.Mock;
  findPublished?: jest.Mock;
} = {}) =>
  ({
    config,
    getModel: () => ({ uid: contentTypeUid }),
    entityValidator: { validateEntityCreation: validate },
    plugin: (name: string) => ({
      service(serviceName: string) {
        if (name === 'review-workflows' && serviceName === 'workflows') return workflowsService;
        if (name === 'content-manager' && serviceName === 'populate-builder')
          return populateBuilder;
        return undefined;
      },
    }),
    documents: () => ({
      findOne: (params: { status?: string }) =>
        params.status === 'published' ? findPublished(params) : findOne(params),
    }),
    // Checks outside a transaction read without a savepoint
    db: { inTransaction: () => false },
  }) as unknown as Core.Strapi;

const requiringDone = () => ({
  getAssignedWorkflow: jest.fn().mockResolvedValue({ stageRequiredToPublish: doneStage }),
});

// One entry's draft, checked as a run checks it
const checkEntry = async (entry: Record<string, unknown>, strapi: Core.Strapi) => {
  const withDraft = {
    ...strapi,
    documents: () => ({
      findOne: async ({ status }: { status?: string }) => (status === 'published' ? null : entry),
    }),
  } as unknown as Core.Strapi;

  const results = await getPublishabilityForActions(
    [
      {
        id: 1,
        type: 'publish' as const,
        contentType: contentTypeUid,
        entryDocumentId: entry.documentId as string,
      },
    ],
    { strapi: withDraft }
  );

  const result = results.get(1)!;
  if (result instanceof Error) {
    throw result;
  }

  return result;
};

describe('publishability of an entry', () => {
  test('a valid entry at the required stage is publishable', async () => {
    const strapi = buildStrapi({ workflowsService: requiringDone() });

    const result = await checkEntry({ id: 1, documentId: 'a', strapi_stage: doneStage }, strapi);

    expect(result).toEqual({ publishable: true, outcome: null, reason: null, error: null });
  });

  test('an invalid entry is skipped as invalid, with the field paths and messages but not the values', async () => {
    const validationError = invalidTitleError();
    const strapi = buildStrapi({ validate: jest.fn().mockRejectedValue(validationError) });

    const result = await checkEntry({ id: 1, documentId: 'a' }, strapi);

    expect(result).toEqual({
      publishable: false,
      outcome: 'skipped_invalid',
      reason: { validation: { errors: [{ path: ['title'], message: 'title must be defined.' }] } },
      // Publishing it would throw this same error, so a rejected release keeps its message
      error: validationError,
    });
  });

  test('a type-mismatch message is kept without the submitted value it ends with', async () => {
    // The message Strapi's yup locale builds for a value of the wrong type
    const yupError = await yup
      .object({ count: yup.number() })
      .validate({ count: 'secret' })
      .then(
        () => {
          throw new Error('Expected a type mismatch');
        },
        (error: yup.ValidationError) => error
      );
    const strapi = buildStrapi({
      validate: jest.fn().mockRejectedValue(new errors.YupValidationError(yupError)),
    });

    const result = await checkEntry({ id: 1, documentId: 'a' }, strapi);

    expect(result.reason).toEqual({
      validation: { errors: [{ path: ['count'], message: 'count must be a `number` type' }] },
    });
  });

  test('a valid entry that is not at the required stage is skipped as not approved', async () => {
    const strapi = buildStrapi({ workflowsService: requiringDone() });

    const result = await checkEntry({ id: 1, documentId: 'a', strapi_stage: reviewStage }, strapi);

    expect(result).toMatchObject({
      publishable: false,
      outcome: 'skipped_not_approved',
      reason: { stage: { entryStage: reviewStage, requiredStage: doneStage } },
    });
    expect(result.reason).not.toHaveProperty('validation');
    expect(result.error?.message).toBe('Entry is not at the required stage to publish');
  });

  test('an entry without a stage is not at the required stage', async () => {
    const strapi = buildStrapi({ workflowsService: requiringDone() });

    const result = await checkEntry({ id: 1, documentId: 'a' }, strapi);

    expect(result).toMatchObject({
      outcome: 'skipped_not_approved',
      reason: { stage: { entryStage: null, requiredStage: doneStage } },
    });
  });

  test('an entry failing both checks is skipped as invalid with both reasons, and fails on the stage first', async () => {
    const strapi = buildStrapi({
      validate: jest.fn().mockRejectedValue(invalidTitleError()),
      workflowsService: requiringDone(),
    });

    const result = await checkEntry({ id: 1, documentId: 'a', strapi_stage: reviewStage }, strapi);

    expect(result).toMatchObject({
      publishable: false,
      outcome: 'skipped_invalid',
      reason: {
        validation: { errors: [{ path: ['title'], message: 'title must be defined.' }] },
        stage: { entryStage: reviewStage, requiredStage: doneStage },
      },
    });
    // review-workflows rejects a publish on the stage before the entry is validated
    expect(result.error?.message).toBe('Entry is not at the required stage to publish');
  });

  test('without an assigned workflow only validation applies', async () => {
    const strapi = buildStrapi();

    const result = await checkEntry({ id: 1, documentId: 'a', strapi_stage: reviewStage }, strapi);

    expect(result.publishable).toBe(true);
  });

  test('without the review-workflows service, an entry is never skipped as not approved', async () => {
    const strapi = buildStrapi({ workflowsService: undefined });

    await expect(checkEntry({ id: 1, documentId: 'a' }, strapi)).resolves.toMatchObject({
      publishable: true,
    });

    const invalidStrapi = buildStrapi({
      workflowsService: undefined,
      validate: jest.fn().mockRejectedValue(invalidTitleError()),
    });

    await expect(checkEntry({ id: 1, documentId: 'a' }, invalidStrapi)).resolves.toMatchObject({
      publishable: false,
      outcome: 'skipped_invalid',
    });
  });
});

describe('getPublishabilityForActions', () => {
  test('looks up the populate and the workflow once per content type', async () => {
    const build = jest.fn().mockResolvedValue({});
    const populateBuilder = jest.fn(() => ({
      populateDeep: () => ({ build }),
    }));
    const workflowsService = requiringDone();
    const findOne = jest.fn(({ documentId }) =>
      Promise.resolve({
        documentId,
        strapi_stage: documentId === 'not-approved' ? reviewStage : doneStage,
      })
    );
    const strapi = buildStrapi({ populateBuilder, workflowsService, findOne });

    const result = await getPublishabilityForActions(
      [
        {
          id: 1,
          type: 'publish' as const,
          contentType: contentTypeUid,
          entryDocumentId: 'approved-1',
        },
        {
          id: 2,
          type: 'publish' as const,
          contentType: contentTypeUid,
          entryDocumentId: 'not-approved',
        },
        {
          id: 3,
          type: 'publish' as const,
          contentType: contentTypeUid,
          entryDocumentId: 'approved-2',
        },
      ],
      { strapi }
    );

    expect(populateBuilder).toHaveBeenCalledTimes(1);
    expect(build).toHaveBeenCalledTimes(1);
    expect(workflowsService.getAssignedWorkflow).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledTimes(3);

    // Results come back in the order given
    expect(
      [...result].map(([id, check]) => [id, check instanceof Error ? check : check.outcome])
    ).toEqual([
      [1, null],
      [2, 'skipped_not_approved'],
      [3, null],
    ]);
  });

  test("leaves the entry's published version out of its unique checks", async () => {
    const validate = jest.fn().mockResolvedValue({});
    const findPublished = jest.fn().mockResolvedValue({ id: 7, documentId: 'a' });
    const strapi = buildStrapi({
      validate,
      findPublished,
      findOne: jest.fn().mockResolvedValue({ id: 1, documentId: 'a', locale: 'en' }),
    });

    await getPublishabilityForActions(
      [
        {
          id: 1,
          type: 'publish' as const,
          contentType: contentTypeUid,
          entryDocumentId: 'a',
          locale: 'en',
        },
      ],
      { strapi }
    );

    expect(findPublished).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 'a', locale: 'en', status: 'published' })
    );
    const [, , , publishedVersion] = validate.mock.calls[0];
    expect(publishedVersion).toEqual({ id: 7, documentId: 'a' });
  });

  describe('a MySQL deadlock', () => {
    const deadlock = Object.assign(new Error('Deadlock found when trying to get lock'), {
      code: 'ER_LOCK_DEADLOCK',
    });
    const deadlockedStrapi = () =>
      buildStrapi({
        findOne: jest.fn().mockRejectedValue(deadlock),
      });
    const action = {
      id: 1,
      type: 'publish' as const,
      contentType: contentTypeUid,
      entryDocumentId: 'a',
    };

    test("stops every check in a transaction: the caller's transaction is gone", async () => {
      const strapi = deadlockedStrapi();
      const inTransaction = {
        ...strapi,
        db: { inTransaction: () => true, savepoint: (cb: () => unknown) => cb() },
      } as unknown as Core.Strapi;

      await expect(getPublishabilityForActions([action], { strapi: inTransaction })).rejects.toBe(
        deadlock
      );
    });

    test('fails only its own check outside a transaction', async () => {
      const results = await getPublishabilityForActions([action], {
        strapi: deadlockedStrapi(),
      });

      expect(results.get(action.id)).toBe(deadlock);
    });
  });
});

describe('an error that is not a validation error', () => {
  const failingValidator = () =>
    buildStrapi({
      validate: jest.fn().mockRejectedValue(new TypeError('Cannot read properties of undefined')),
      findOne: jest.fn().mockResolvedValue({ documentId: 'a' }),
    });
  const action = {
    id: 1,
    type: 'publish' as const,
    contentType: contentTypeUid,
    entryDocumentId: 'a',
  };

  test('comes back as the check of the entry, for the run to decide on', async () => {
    const result = await getPublishabilityForActions([action], { strapi: failingValidator() });

    expect(result.get(1)).toBeInstanceOf(TypeError);
  });

  test('is stored with only its name, not as a validation error', async () => {
    const result = await getValidityForActions([action], { strapi: failingValidator() });

    expect(result.get(1)).toEqual({
      isEntryValid: false,
      reason: { error: { name: 'TypeError' } },
    });
  });
});

describe('getValidityForActions', () => {
  test("stores a draft that can't be read as not publishable, without stopping the others", async () => {
    const findOne = jest.fn(({ documentId }) =>
      documentId === 'unreadable'
        ? Promise.reject(new TypeError('connection lost'))
        : Promise.resolve({
            documentId,
            strapi_stage: documentId === 'approved' ? doneStage : reviewStage,
          })
    );
    const strapi = buildStrapi({ workflowsService: requiringDone(), findOne });

    const result = await getValidityForActions(
      [
        {
          id: 1,
          type: 'publish' as const,
          contentType: contentTypeUid,
          entryDocumentId: 'unreadable',
        },
        {
          id: 2,
          type: 'publish' as const,
          contentType: contentTypeUid,
          entryDocumentId: 'approved',
        },
        {
          id: 3,
          type: 'publish' as const,
          contentType: contentTypeUid,
          entryDocumentId: 'in-review',
        },
      ],
      { strapi }
    );

    expect([...result]).toEqual([
      [1, { isEntryValid: false, reason: { error: { name: 'TypeError' } } }],
      [2, { isEntryValid: true, reason: null }],
      [
        3,
        {
          isEntryValid: false,
          reason: { stage: { entryStage: reviewStage, requiredStage: doneStage } },
        },
      ],
    ]);
  });

  test('checks only publish actions: an unpublish action needs no draft', async () => {
    const findOne = jest.fn();
    const strapi = buildStrapi({ workflowsService: requiringDone(), findOne });

    const result = await getValidityForActions(
      [{ id: 1, type: 'unpublish' as const, contentType: contentTypeUid, entryDocumentId: 'a' }],
      { strapi }
    );

    expect(findOne).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  test('reads the draft of an entry in several planned releases once', async () => {
    const findOne = jest.fn(({ documentId }) =>
      Promise.resolve({ documentId, strapi_stage: doneStage })
    );
    const strapi = buildStrapi({ workflowsService: requiringDone(), findOne });

    const result = await getValidityForActions(
      [
        // One entry's actions in two releases, then another locale of it
        {
          id: 1,
          type: 'publish' as const,
          contentType: contentTypeUid,
          entryDocumentId: 'a',
          locale: 'en',
        },
        {
          id: 2,
          type: 'publish' as const,
          contentType: contentTypeUid,
          entryDocumentId: 'a',
          locale: 'en',
        },
        {
          id: 3,
          type: 'publish' as const,
          contentType: contentTypeUid,
          entryDocumentId: 'a',
          locale: 'fr',
        },
      ],
      { strapi }
    );

    expect(findOne).toHaveBeenCalledTimes(2);
    expect([...result].map(([id, validity]) => [id, validity.isEntryValid])).toEqual([
      [1, true],
      [2, true],
      [3, true],
    ]);
  });
});

// Mirrors the document service's publish, so an entry the check passes isn't rejected at publish
// (issue #24927 / PR #27028)
describe('strict relations', () => {
  const withStrictRelations = (strictRelations: unknown, validate: jest.Mock) =>
    buildStrapi({
      validate,
      config: {
        get: (key: string, defaultValue: unknown) =>
          key === 'api.documents.strictRelations' ? strictRelations : defaultValue,
      },
    });

  test('forwards strictRelations: true and the entry locale to the validator', async () => {
    const validate = jest.fn().mockResolvedValue({});

    await checkEntry(
      { id: 1, documentId: 'article-1', locale: 'en' },
      withStrictRelations(true, validate)
    );

    const [, , options] = validate.mock.calls[0];
    expect(options).toEqual({ isDraft: false, locale: 'en', strictRelations: true });
  });

  test('forwards strictRelations: false when the flag is unset', async () => {
    const validate = jest.fn().mockResolvedValue({});

    await checkEntry({ id: 1, documentId: 'article-1' }, withStrictRelations(undefined, validate));

    const [, , options] = validate.mock.calls[0];
    expect(options).toEqual({ isDraft: false, locale: undefined, strictRelations: false });
  });

  test('an entry missing a required relation with the flag on is not publishable', async () => {
    const validate = jest
      .fn()
      .mockRejectedValue(new errors.ValidationError('author must be defined.'));

    const { publishable } = await checkEntry(
      { id: 1, documentId: 'article-1' },
      withStrictRelations(true, validate)
    );

    expect(publishable).toBe(false);
  });
});

describe('getActionValidity', () => {
  test('stores a failing draft read as not valid, with only the error name', async () => {
    const strapi = {
      plugin: () => ({
        service: () => () => ({ populateDeep: () => ({ build: async () => ({}) }) }),
      }),
      documents: () => ({
        findOne: jest.fn().mockRejectedValue(new TypeError('connection lost: secret-value')),
      }),
      db: { inTransaction: () => false },
    } as unknown as Core.Strapi; // only what the draft read touches

    const validity = await getActionValidity(
      { type: 'publish', contentType: contentTypeUid, entryDocumentId: 'article-1', locale: 'en' },
      { strapi }
    );

    expect(validity).toStrictEqual({
      isEntryValid: false,
      reason: { error: { name: 'TypeError' } },
    });
  });
});
