import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { getEntryPublishability, getPublishabilityForActions } from '../index';

const contentTypeUid = 'api::article.article';
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
  validate = jest.fn().mockResolvedValue({}),
  workflowsService = { getAssignedWorkflow: jest.fn().mockResolvedValue(null) },
  populateBuilder = jest.fn(),
  findOne = jest.fn(),
}: {
  validate?: jest.Mock;
  workflowsService?: { getAssignedWorkflow: jest.Mock } | undefined;
  populateBuilder?: jest.Mock;
  findOne?: jest.Mock;
} = {}) =>
  ({
    config: { get: (_key: string, defaultValue: unknown) => defaultValue },
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
    documents: () => ({ findOne }),
    // No entry has a published version
    db: { query: () => ({ findOne: jest.fn().mockResolvedValue(null) }) },
  }) as unknown as Core.Strapi;

const requiringDone = () => ({
  getAssignedWorkflow: jest.fn().mockResolvedValue({ stageRequiredToPublish: doneStage }),
});

describe('getEntryPublishability', () => {
  test('a valid entry at the required stage is publishable', async () => {
    const strapi = buildStrapi({ workflowsService: requiringDone() });

    const result = await getEntryPublishability(
      contentTypeUid,
      { id: 1, documentId: 'a', strapi_stage: doneStage },
      { strapi }
    );

    expect(result).toEqual({ publishable: true, outcome: null, reason: null, error: null });
  });

  test('an invalid entry is skipped as invalid, with the field paths and messages but not the values', async () => {
    const validationError = invalidTitleError();
    const strapi = buildStrapi({ validate: jest.fn().mockRejectedValue(validationError) });

    const result = await getEntryPublishability(
      contentTypeUid,
      { id: 1, documentId: 'a' },
      { strapi }
    );

    expect(result).toEqual({
      publishable: false,
      outcome: 'skipped_invalid',
      reason: { validation: { errors: [{ path: ['title'], message: 'title must be defined.' }] } },
      // Publishing it would throw this same error, so a rejected release keeps its message
      error: validationError,
    });
  });

  test('a valid entry that is not at the required stage is skipped as not approved', async () => {
    const strapi = buildStrapi({ workflowsService: requiringDone() });

    const result = await getEntryPublishability(
      contentTypeUid,
      { id: 1, documentId: 'a', strapi_stage: reviewStage },
      { strapi }
    );

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

    const result = await getEntryPublishability(
      contentTypeUid,
      { id: 1, documentId: 'a' },
      { strapi }
    );

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

    const result = await getEntryPublishability(
      contentTypeUid,
      { id: 1, documentId: 'a', strapi_stage: reviewStage },
      { strapi }
    );

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

    const result = await getEntryPublishability(
      contentTypeUid,
      { id: 1, documentId: 'a', strapi_stage: reviewStage },
      { strapi }
    );

    expect(result.publishable).toBe(true);
  });

  test('without the review-workflows service, an entry is never skipped as not approved', async () => {
    const strapi = buildStrapi({ workflowsService: undefined });

    await expect(
      getEntryPublishability(contentTypeUid, { id: 1, documentId: 'a' }, { strapi })
    ).resolves.toMatchObject({ publishable: true });

    const invalidStrapi = buildStrapi({
      workflowsService: undefined,
      validate: jest.fn().mockRejectedValue(invalidTitleError()),
    });

    await expect(
      getEntryPublishability(contentTypeUid, { id: 1, documentId: 'a' }, { strapi: invalidStrapi })
    ).resolves.toMatchObject({ publishable: false, outcome: 'skipped_invalid' });
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
        { id: 1, contentType: contentTypeUid, entryDocumentId: 'approved-1' },
        { id: 2, contentType: contentTypeUid, entryDocumentId: 'not-approved' },
        { id: 3, contentType: contentTypeUid, entryDocumentId: 'approved-2' },
      ],
      { strapi }
    );

    expect(populateBuilder).toHaveBeenCalledTimes(1);
    expect(build).toHaveBeenCalledTimes(1);
    expect(workflowsService.getAssignedWorkflow).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledTimes(3);

    // Results come back in the order given, each with its own action
    expect(result.map(({ action, publishability }) => [action.id, publishability.outcome])).toEqual(
      [
        [1, null],
        [2, 'skipped_not_approved'],
        [3, null],
      ]
    );
  });
});
