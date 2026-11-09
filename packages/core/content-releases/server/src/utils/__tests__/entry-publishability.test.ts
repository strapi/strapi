import { errors, yup } from '@strapi/utils';
import type { Core } from '@strapi/types';

import {
  getActionValidity,
  getPublishabilityForActions,
  getStageReason,
  getValidityForActions,
} from '../index';

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

  // The run can't record any of these as the entry's own failure: its transaction is gone, or it
  // lost to another transaction and can run again
  describe.each([
    ['a MySQL deadlock', { code: 'ER_LOCK_DEADLOCK' }],
    ['a MySQL lock wait timeout', { code: 'ER_LOCK_WAIT_TIMEOUT' }],
    ['a Postgres deadlock', { code: '40P01' }],
    ['a Postgres serialization failure', { code: '40001' }],
    ['a savepoint the database could not end', { name: 'SavepointError' }],
  ])('%s', (_, props) => {
    const conflict = Object.assign(new Error('Conflict with another transaction'), props);
    const conflictedStrapi = () =>
      buildStrapi({
        findOne: jest.fn().mockRejectedValue(conflict),
      });
    const action = {
      id: 1,
      type: 'publish' as const,
      contentType: contentTypeUid,
      entryDocumentId: 'a',
    };

    test("stops every check in a transaction: the caller's transaction must fail", async () => {
      const strapi = conflictedStrapi();
      const inTransaction = {
        ...strapi,
        db: { inTransaction: () => true, savepoint: (cb: () => unknown) => cb() },
      } as unknown as Core.Strapi;

      await expect(getPublishabilityForActions([action], { strapi: inTransaction })).rejects.toBe(
        conflict
      );
    });

    test('fails only its own check outside a transaction', async () => {
      const results = await getPublishabilityForActions([action], {
        strapi: conflictedStrapi(),
      });

      expect(results.get(action.id)).toBe(conflict);
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

  test("is stored with the driver's error code, which tells a database error apart", async () => {
    // node-postgres names its errors `error`; the message can quote the row
    const driverError = Object.assign(
      new Error('duplicate key value violates unique constraint: (slug)=(secret)'),
      { name: 'error', code: '23505' }
    );
    const strapi = buildStrapi({
      validate: jest.fn().mockRejectedValue(driverError),
      findOne: jest.fn().mockResolvedValue({ documentId: 'a' }),
    });

    const result = await getValidityForActions([action], { strapi });

    expect(result.get(1)).toEqual({
      isEntryValid: false,
      reason: { error: { name: 'error', code: '23505' } },
    });
  });

  test('is stored without a code that is not a string', async () => {
    const strapi = buildStrapi({
      validate: jest.fn().mockRejectedValue(Object.assign(new Error('Failed'), { code: 1213 })),
      findOne: jest.fn().mockResolvedValue({ documentId: 'a' }),
    });

    const result = await getValidityForActions([action], { strapi });

    expect(result.get(1)).toEqual({ isEntryValid: false, reason: { error: { name: 'Error' } } });
  });

  test("keeps an application error's message, which is meant for the client", async () => {
    const strapi = buildStrapi({
      validate: jest
        .fn()
        .mockRejectedValue(new errors.ApplicationError('The partner API is not answering')),
      findOne: jest.fn().mockResolvedValue({ documentId: 'a' }),
    });

    const result = await getValidityForActions([action], { strapi });

    expect(result.get(1)).toEqual({
      isEntryValid: false,
      reason: {
        error: { name: 'ApplicationError', message: 'The partner API is not answering' },
      },
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

// Under the flag, publish connects each relation to its target's published version and drops the
// targets without one before validating (document service `transform/relations/transform/data-ids`)
describe('strict relations, as publish connects them in a run', () => {
  const ARTICLE = 'api::article.article' as const;
  const CATEGORY = 'api::category.category' as const;
  const AUTHOR = 'api::author.author' as const;
  const SEO = 'shared.seo';
  const BLOCK = 'shared.block';

  const models: Record<string, unknown> = {
    [ARTICLE]: {
      uid: ARTICLE,
      options: { draftAndPublish: true },
      attributes: {
        category: { type: 'relation', relation: 'manyToOne', target: CATEGORY, required: true },
        categories: {
          type: 'relation',
          relation: 'manyToMany',
          target: CATEGORY,
          required: true,
        },
        related: { type: 'relation', relation: 'manyToOne', target: CATEGORY },
        author: { type: 'relation', relation: 'manyToOne', target: AUTHOR, required: true },
        seo: { type: 'component', component: SEO },
        blocks: { type: 'dynamiczone', components: [BLOCK] },
      },
    },
    [CATEGORY]: { uid: CATEGORY, options: { draftAndPublish: true }, attributes: {} },
    // Without draft and publish: always published
    [AUTHOR]: { uid: AUTHOR, options: { draftAndPublish: false }, attributes: {} },
    [SEO]: {
      uid: SEO,
      attributes: {
        category: { type: 'relation', relation: 'oneToOne', target: CATEGORY, required: true },
      },
    },
    [BLOCK]: {
      uid: BLOCK,
      attributes: {
        category: { type: 'relation', relation: 'oneToOne', target: CATEGORY, required: true },
      },
    },
  };

  const target = (documentId: string) => ({ id: 10, documentId, locale: 'en' });

  const check = async (
    draft: Record<string, unknown>,
    {
      published = [],
      before = [],
      after = [],
      strictRelations = true,
    }: {
      // Documents with a published version before the run
      published?: string[];
      // Actions of the run before and after the article's, in run order
      before?: { type: 'publish' | 'unpublish'; documentId: string }[];
      after?: { type: 'publish' | 'unpublish'; documentId: string }[];
      strictRelations?: boolean;
    } = {}
  ) => {
    const validate = jest.fn().mockResolvedValue({});
    const findPublished = jest.fn(async ({ documentId }: { documentId: string }) =>
      published.includes(documentId) ? { documentId } : null
    );
    const strapi = {
      ...buildStrapi({
        validate,
        config: {
          get: (key: string, defaultValue: unknown) =>
            key === 'api.documents.strictRelations' ? strictRelations : defaultValue,
        },
      }),
      getModel: (uid: string) => models[uid],
      documents: (uid: string) => ({
        findOne(params: { documentId: string; status?: string }) {
          if (params.status === 'published') {
            // The article's own published version, for its unique checks
            return uid === ARTICLE ? null : findPublished(params);
          }
          return uid === ARTICLE
            ? { documentId: 'article', locale: 'en', ...draft }
            : target(params.documentId);
        },
      }),
    } as unknown as Core.Strapi;

    const toAction = (
      { type, documentId }: { type: 'publish' | 'unpublish'; documentId: string },
      id: number
    ) => ({ id, type, contentType: CATEGORY, entryDocumentId: documentId, locale: 'en' });

    await getPublishabilityForActions(
      [
        ...before.map((action, index) => toAction(action, 100 + index)),
        {
          id: 1,
          type: 'publish' as const,
          contentType: ARTICLE,
          entryDocumentId: 'article',
          locale: 'en',
        },
        ...after.map((action, index) => toAction(action, 200 + index)),
      ],
      { strapi }
    );

    const articleCall = validate.mock.calls.find(([model]) => model.uid === ARTICLE);
    return { validated: articleCall?.[1], findPublished };
  };

  test('drops a required target without a published version, as publish does', async () => {
    const { validated } = await check(
      { category: target('draft-only'), categories: [target('draft-only'), target('live')] },
      { published: ['live'] }
    );

    expect(validated).toMatchObject({ category: null, categories: [target('live')] });
  });

  test('keeps a required target published by an earlier action of the run', async () => {
    const { validated } = await check(
      { category: target('new') },
      { before: [{ type: 'publish', documentId: 'new' }] }
    );

    expect(validated).toMatchObject({ category: target('new') });
  });

  test('drops a required target published only by a later action of the run', async () => {
    const { validated } = await check(
      { category: target('new') },
      { after: [{ type: 'publish', documentId: 'new' }] }
    );

    expect(validated).toMatchObject({ category: null });
  });

  test('drops a required target an earlier action of the run unpublishes', async () => {
    const { validated } = await check(
      { category: target('live') },
      { published: ['live'], before: [{ type: 'unpublish', documentId: 'live' }] }
    );

    expect(validated).toMatchObject({ category: null });
  });

  test('keeps a target without draft and publish, and leaves relations that are not required', async () => {
    const author = { id: 3, documentId: 'author' };
    const { validated, findPublished } = await check({
      author,
      related: target('draft-only'),
    });

    expect(validated).toMatchObject({ author, related: target('draft-only') });
    expect(findPublished).not.toHaveBeenCalled();
  });

  test('drops required targets in components and dynamic zones', async () => {
    const { validated } = await check({
      seo: { id: 1, category: target('draft-only') },
      blocks: [{ __component: BLOCK, id: 2, category: target('draft-only') }],
    });

    expect(validated).toMatchObject({
      seo: { category: null },
      blocks: [{ __component: BLOCK, category: null }],
    });
  });

  test('drops a required target without a document id, which publish cannot connect', async () => {
    const { validated } = await check(
      { category: { id: 10, locale: 'en' } },
      { published: ['live'] }
    );

    expect(validated).toMatchObject({ category: null });
  });

  test('leaves a dynamic zone item without a component uid, and a component that is not an object', async () => {
    const { validated } = await check({ seo: 'not-a-component', blocks: [{ id: 2 }] });

    expect(validated).toMatchObject({ seo: 'not-a-component', blocks: [{ id: 2 }] });
  });

  test('reads the published version of a target once', async () => {
    const { findPublished } = await check(
      { category: target('live'), categories: [target('live')] },
      { published: ['live'] }
    );

    expect(findPublished).toHaveBeenCalledTimes(1);
  });

  test('validates the draft as is with the flag off', async () => {
    const { validated, findPublished } = await check(
      { category: target('draft-only') },
      {
        strictRelations: false,
      }
    );

    expect(validated).toMatchObject({ category: target('draft-only') });
    expect(findPublished).not.toHaveBeenCalled();
  });
});

describe('getStageReason', () => {
  const draft = { contentType: contentTypeUid, entryDocumentId: 'a', locale: 'en' };

  const withStage = ({
    workflowsService = requiringDone(),
    findOne = jest.fn().mockResolvedValue({ documentId: 'a', strapi_stage: reviewStage }),
    db = { inTransaction: () => false },
  }: {
    workflowsService?: { getAssignedWorkflow: jest.Mock } | undefined;
    findOne?: jest.Mock;
    db?: Record<string, unknown>;
  } = {}) => ({ ...buildStrapi({ workflowsService, findOne }), db }) as unknown as Core.Strapi;

  test("is the entry's stage and the one its workflow requires", async () => {
    const findOne = jest.fn().mockResolvedValue({ documentId: 'a', strapi_stage: reviewStage });

    await expect(getStageReason(draft, { strapi: withStage({ findOne }) })).resolves.toEqual({
      stage: { entryStage: reviewStage, requiredStage: doneStage },
    });
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 'a', locale: 'en', populate: ['strapi_stage'] })
    );
  });

  test('has no entry stage for an entry without one, or that is gone', async () => {
    const strapi = withStage({ findOne: jest.fn().mockResolvedValue(null) });

    await expect(getStageReason(draft, { strapi })).resolves.toEqual({
      stage: { entryStage: null, requiredStage: doneStage },
    });
  });

  test('is null when no stage is required anymore', async () => {
    const findOne = jest.fn();
    const noWorkflow = withStage({
      workflowsService: { getAssignedWorkflow: jest.fn().mockResolvedValue(null) },
      findOne,
    });

    await expect(getStageReason(draft, { strapi: noWorkflow })).resolves.toBeNull();
    // A workflow without a required stage, and no review-workflows plugin
    const noRequiredStage = withStage({
      workflowsService: {
        getAssignedWorkflow: jest.fn().mockResolvedValue({ stageRequiredToPublish: null }),
      },
      findOne,
    });
    await expect(getStageReason(draft, { strapi: noRequiredStage })).resolves.toBeNull();
    const noPlugin = { ...noWorkflow, plugin: () => undefined } as unknown as Core.Strapi;
    await expect(getStageReason(draft, { strapi: noPlugin })).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  test('is null when the stages cannot be read', async () => {
    const strapi = withStage({
      findOne: jest.fn().mockRejectedValue(new TypeError('connection lost')),
    });

    await expect(getStageReason(draft, { strapi })).resolves.toBeNull();
  });

  test('reads in a savepoint in a transaction, and rethrows a run conflict', async () => {
    const conflict = Object.assign(new Error('Deadlock'), { code: '40P01' });
    const savepoint = jest.fn((cb: () => unknown) => cb());
    const strapi = withStage({
      findOne: jest.fn().mockRejectedValue(conflict),
      db: { inTransaction: () => true, savepoint },
    });

    await expect(getStageReason(draft, { strapi })).rejects.toBe(conflict);
    expect(savepoint).toHaveBeenCalledTimes(1);
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
