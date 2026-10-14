import type { Core } from '@strapi/types';
import { describe, expect, it, vi } from 'vitest';
import weeklyMetrics from '../weekly-metrics';

const { find } = vi.hoisted(() => ({
  find: vi.fn(),
}));

vi.mock('../../../utils', () => ({
  getService: (name: string) => (name === 'workflows' ? { find } : {}),
}));

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
});
