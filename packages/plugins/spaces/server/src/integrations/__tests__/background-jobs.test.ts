import { SPACE_ATTRIBUTE } from '../../../../shared/constants';
import { getScope, runGlobal, runInSpace, runUnscoped } from '../../scope/context';
import { registerBackgroundJobIntegration } from '../background-jobs';

const FRANCE = { id: 1, slug: 'fr', status: 'active' };

interface Options {
  /** release id -> the space it belongs to. */
  releases?: Record<string, { id: number; slug: string; status: string } | null>;
  /** What a scoped read of the release table can see. */
  visibleToCaller?: boolean;
}

const makeStrapi = ({ releases = { 7: FRANCE }, visibleToCaller = true }: Options = {}) => {
  /** The scope in force when the underlying publish finally ran. */
  const ranIn: unknown[] = [];

  const releaseService = {
    async publish(releaseId: string | number) {
      ranIn.push({ releaseId, scope: getScope(strapi) });

      return 'published';
    },
  };

  // Kept out of the `as never` cast below, so a test can put a request with no
  // space in force.
  const requestContext = {
    get: (): { state: Record<string, unknown> } | undefined => undefined,
  };

  const strapi = {
    requestContext,
    plugin: () => ({ service: () => releaseService }),
    db: {
      query: () => ({
        async findOne({ where }: { where: { id: string | number } }) {
          const space = releases[String(where.id)];

          if (!space) {
            return null;
          }

          // A scoped lookup answers "can the caller see it?"; the unscoped one
          // used to find the release's space always answers.
          if (getScope(strapi).mode === 'space' && !visibleToCaller) {
            return null;
          }

          return { id: where.id, [SPACE_ATTRIBUTE]: space };
        },
      }),
    },
  } as never;

  registerBackgroundJobIntegration(strapi);

  return { strapi, requestContext, releaseService, ranIn };
};

describe('publishing a release', () => {
  describe('from inside a space', () => {
    it('goes ahead for a release that space can see', async () => {
      const { releaseService, ranIn } = makeStrapi();

      await runInSpace({ id: 1, slug: 'fr' }, () => releaseService.publish(7));

      expect(ranIn).toHaveLength(1);
    });

    it('refuses a release the caller cannot see', async () => {
      // The publish endpoint hands the id straight to the service, so knowing
      // another space's release id must not be enough to publish in it.
      const { releaseService } = makeStrapi({ visibleToCaller: false });

      await expect(
        runInSpace({ id: 1, slug: 'fr' }, () => releaseService.publish(7))
      ).rejects.toThrow(/not found/i);
    });

    it('does not raise the caller into the release’s space', async () => {
      const { strapi, releaseService, ranIn } = makeStrapi();

      await runInSpace({ id: 1, slug: 'fr' }, () => releaseService.publish(7));

      expect((ranIn[0] as { scope: { mode: string; id?: number } }).scope).toMatchObject({
        mode: 'space',
        id: 1,
      });
      expect(getScope(strapi).mode).toBe('unscoped');
    });
  });

  describe('from no space at all', () => {
    it('runs in the release’s own space, which is what the scheduler needs', async () => {
      // A scheduled publish fires long after the request that set it up ended,
      // so it takes its space from the release.
      const { releaseService, ranIn } = makeStrapi();

      await runUnscoped(() => releaseService.publish(7));

      expect((ranIn[0] as { scope: { mode: string; id?: number } }).scope).toMatchObject({
        mode: 'space',
        id: 1,
      });
    });

    it('resolves that space when it publishes, not when it was scheduled', async () => {
      // A release can be moved, or its space archived, in between.
      const { releaseService, ranIn } = makeStrapi({
        releases: { 7: { ...FRANCE, status: 'archived' } },
      });

      await runUnscoped(() => releaseService.publish(7));

      expect((ranIn[0] as { scope: { mode: string } }).scope.mode).toBe('unscoped');
    });

    it('runs unscoped for a release that belongs to no space', async () => {
      const { releaseService, ranIn } = makeStrapi({ releases: { 7: null } });

      await runUnscoped(() => releaseService.publish(7));

      expect((ranIn[0] as { scope: { mode: string } }).scope.mode).toBe('unscoped');
    });

    it('takes the release’s space from the all-spaces view too', async () => {
      const { releaseService, ranIn } = makeStrapi();

      await runGlobal(() => releaseService.publish(7));

      expect((ranIn[0] as { scope: { mode: string; id?: number } }).scope).toMatchObject({
        mode: 'space',
        id: 1,
      });
    });
  });

  describe('from a request with no space', () => {
    it('is refused', async () => {
      const { requestContext, releaseService } = makeStrapi();
      requestContext.get = () => ({ state: {} });

      await expect(releaseService.publish(7)).rejects.toThrow(/no space/i);
    });
  });
});
