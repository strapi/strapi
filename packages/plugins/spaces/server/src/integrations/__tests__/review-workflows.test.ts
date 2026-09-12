import { runGlobal, runInSpace, runUnscoped } from '../../scope/context';
import { registerReviewWorkflowIntegration } from '../review-workflows';

const makeStrapi = () => {
  const calls: string[] = [];

  const stages = {
    async updateEntitiesStage() {
      calls.push('updateEntitiesStage');
    },
    async deleteAllEntitiesStage() {
      calls.push('deleteAllEntitiesStage');
    },
    /** Not one of the project-wide rewrites, so it is left alone. */
    async find() {
      calls.push('find');
    },
  };

  const strapi = {
    requestContext: { get: () => undefined },
    plugin: () => ({ service: () => stages }),
  } as never;

  registerReviewWorkflowIntegration(strapi);

  return { stages, calls };
};

/**
 * Reorganising a workflow rewrites every entry's stage for a content type in
 * one statement of raw SQL, which the query builder — and so the query scope —
 * never sees. It is a project-wide change, so it is made from the all-spaces
 * view where its reach is what the caller expects.
 */
describe('reorganising a review workflow', () => {
  it.each(['updateEntitiesStage', 'deleteAllEntitiesStage'] as const)(
    'is refused from inside a space (%s)',
    async (method) => {
      const { stages, calls } = makeStrapi();

      await expect(runInSpace({ id: 1, slug: 'fr' }, () => stages[method]())).rejects.toThrow(
        /all-spaces view/i
      );

      expect(calls).toEqual([]);
    }
  );

  it('goes ahead from the all-spaces view', async () => {
    const { stages, calls } = makeStrapi();

    await runGlobal(() => stages.updateEntitiesStage());

    expect(calls).toEqual(['updateEntitiesStage']);
  });

  it('goes ahead for trusted code outside any request', async () => {
    const { stages, calls } = makeStrapi();

    await runUnscoped(() => stages.deleteAllEntitiesStage());

    expect(calls).toEqual(['deleteAllEntitiesStage']);
  });

  it('leaves everything else about workflows per-space', async () => {
    const { stages, calls } = makeStrapi();

    await runInSpace({ id: 1, slug: 'fr' }, () => stages.find());

    expect(calls).toEqual(['find']);
  });
});
