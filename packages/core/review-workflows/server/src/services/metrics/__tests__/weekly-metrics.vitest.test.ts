import type { Core } from '@strapi/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import weeklyMetrics from '../weekly-metrics';

const { find } = vi.hoisted(() => ({
  find: vi.fn(),
}));

vi.mock('../../../utils', async () => {
  const workflowMetrics = (await vi.importActual<typeof import('../index')>('../index')).default;

  return {
    getService(name: string) {
      if (name === 'workflow-metrics') {
        return workflowMetrics;
      }
      if (name === 'workflows') {
        return { find };
      }
      return {};
    },
  };
});

describe('weekly review workflow metrics', () => {
  it('counts stages and content types per workflow, including empty collections', async () => {
    find.mockResolvedValue([
      { stages: [{ id: 1 }, { id: 2 }], contentTypes: ['api::article.article'] },
      { stages: [{ id: 3 }], contentTypes: ['api::page.page', 'api::author.author'] },
      { stages: [], contentTypes: [] },
    ]);
    const metrics = weeklyMetrics({ strapi: {} as Core.Strapi });

    await expect(metrics.computeMetrics()).resolves.toEqual({
      numberOfActiveWorkflows: 3,
      avgStagesCount: 1,
      maxStagesCount: 2,
      activatedContentTypes: 3,
    });
    expect(find).toHaveBeenCalledWith({ populate: 'stages' });
  });

  describe('sendMetrics', () => {
    const send = vi.fn();
    const setStore = vi.fn();

    const strapiMock = {
      telemetry: { send },
      store: { get: vi.fn(async () => ({})), set: setStore },
    } as unknown as Core.Strapi;

    beforeEach(() => {
      vi.clearAllMocks();
      // The telemetry helpers in `../index` read the global `strapi`
      vi.stubGlobal('strapi', strapiMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('sends each computed metric as its own group property', async () => {
      find.mockResolvedValue([
        { stages: [{}, {}], contentTypes: ['api::a.a'] },
        { stages: [{}, {}, {}, {}], contentTypes: ['api::b.b', 'api::c.c'] },
      ]);

      await weeklyMetrics({ strapi: strapiMock }).sendMetrics();

      expect(send).toHaveBeenCalledWith('didSendReviewWorkflowPropertiesOnceAWeek', {
        groupProperties: {
          numberOfActiveWorkflows: 2,
          avgStagesCount: 3,
          maxStagesCount: 4,
          activatedContentTypes: 3,
        },
      });
      expect(setStore).toHaveBeenCalledWith(
        expect.objectContaining({ value: { lastWeeklyUpdate: expect.any(Number) } })
      );
    });

    it('stores lastWeeklyUpdate only after the telemetry send settles', async () => {
      find.mockResolvedValue([{ stages: [{}], contentTypes: [] }]);

      let resolveSend: (value: boolean) => void = () => {};
      send.mockReturnValueOnce(
        new Promise<boolean>((resolve) => {
          resolveSend = resolve;
        })
      );

      const sending = weeklyMetrics({ strapi: strapiMock }).sendMetrics();

      await new Promise(setImmediate);
      expect(send).toHaveBeenCalledTimes(1);
      expect(setStore).not.toHaveBeenCalled();

      resolveSend(true);
      await sending;

      expect(setStore).toHaveBeenCalledTimes(1);
    });
  });
});
