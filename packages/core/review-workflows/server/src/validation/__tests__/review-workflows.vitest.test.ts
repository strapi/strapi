import type { Core } from '@strapi/types';
import { describe, expect, test, vi } from 'vitest';

import { ENTITY_STAGE_ATTRIBUTE } from '../../constants/workflows';
import { validateWorkflowCreate, validateWorkflowUpdate } from '../review-workflows';

const models: Record<string, unknown> = {
  'api::article.article': { attributes: { [ENTITY_STAGE_ATTRIBUTE]: {} } },
  'api::page.page': { attributes: {} },
};

const strapi = {
  getModel: vi.fn((uid: string) => models[uid]),
} as unknown as Core.Strapi;

const workflow = {
  name: 'Default',
  stages: [{ name: 'To do' }],
};

const validationErrorWith = (message: string) => ({
  details: { errors: expect.arrayContaining([expect.objectContaining({ message })]) },
});

describe('Review workflows validation', () => {
  test('accepts content types that exist and have review workflows enabled', async () => {
    await expect(
      validateWorkflowCreate({ strapi }, { ...workflow, contentTypes: ['api::article.article'] })
    ).resolves.toMatchObject({ contentTypes: ['api::article.article'] });
  });

  test('rejects content types unknown to the given strapi instance', async () => {
    await expect(
      validateWorkflowCreate({ strapi }, { ...workflow, contentTypes: ['api::missing.missing'] })
    ).rejects.toMatchObject(
      validationErrorWith('Content type api::missing.missing does not exist')
    );
  });

  test('rejects content types without review workflows enabled', async () => {
    await expect(
      validateWorkflowUpdate({ strapi }, { contentTypes: ['api::page.page'] })
    ).rejects.toMatchObject(
      validationErrorWith('Content type api::page.page does not have review workflow enabled')
    );
  });
});
