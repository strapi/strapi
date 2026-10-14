/**
 * Pins the telemetry events of the workflow metrics service. The service is resolved like the core
 * service registry does (`typeof value === 'function' ? value({ strapi }) : value`), and the same
 * mock is stubbed as the global `strapi`, so these tests hold whether the code reads the injected
 * instance or the global one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import workflowMetrics from '..';

type Factory = (params: { strapi: unknown }) => unknown;
type Send = (...args: unknown[]) => Promise<void>;

const resolveService = (value: unknown, strapi: unknown) => {
  const service = typeof value === 'function' ? (value as Factory)({ strapi }) : value;
  return service as Record<string, Send>;
};

describe('review-workflows metrics service', () => {
  const strapi = { telemetry: { send: vi.fn() } };
  let metrics: Record<string, Send>;

  beforeEach(() => {
    strapi.telemetry.send.mockReset();
    vi.stubGlobal('strapi', strapi);
    metrics = resolveService(workflowMetrics, strapi);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['sendDidCreateStage', [], 'didCreateStage', {}],
    ['sendDidEditStage', [], 'didEditStage', {}],
    ['sendDidDeleteStage', [], 'didDeleteStage', {}],
    ['sendDidChangeEntryStage', [], 'didChangeEntryStage', {}],
    [
      'sendDidCreateWorkflow',
      ['1', true],
      'didCreateWorkflow',
      { workflowId: '1', hasRequiredStageToPublish: true },
    ],
    [
      'sendDidEditWorkflow',
      ['1', false],
      'didEditWorkflow',
      { workflowId: '1', hasRequiredStageToPublish: false },
    ],
    ['sendDidEditAssignee', [2, 3], 'didEditAssignee', { from: 2, to: 3 }],
    [
      'sendDidSendReviewWorkflowPropertiesOnceAWeek',
      [
        {
          numberOfActiveWorkflows: 1,
          avgStagesCount: 2,
          maxStagesCount: 3,
          activatedContentTypes: 4,
        },
      ],
      'didSendReviewWorkflowPropertiesOnceAWeek',
      {
        groupProperties: {
          numberOfActiveWorkflows: 1,
          avgStagesCount: 2,
          maxStagesCount: 3,
          activatedContentTypes: 4,
        },
      },
    ],
  ])('%s sends the telemetry event', async (method, args, event, payload) => {
    await metrics[method](...args);

    expect(strapi.telemetry.send).toHaveBeenCalledTimes(1);
    expect(strapi.telemetry.send).toHaveBeenCalledWith(event, payload);
  });
});
