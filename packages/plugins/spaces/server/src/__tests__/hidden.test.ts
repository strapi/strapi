import { SPACE_ATTRIBUTE } from '../../../shared/constants';
import registerHiding from '../hidden';

const makeStrapi = ({ scoped = ['api::article.article'] }: { scoped?: string[] } = {}) => {
  let middleware: (context: unknown, next: () => Promise<unknown>) => Promise<unknown> = async (
    _context,
    next
  ) => next();

  const strapi = {
    contentType: (uid: string) =>
      scoped.includes(uid) ? { uid, attributes: { [SPACE_ATTRIBUTE]: {} } } : undefined,
    documents: {
      use(next: typeof middleware) {
        middleware = next;
      },
    },
  } as never;

  registerHiding({ strapi });

  return {
    read: (uid: string, result: unknown) => middleware({ uid }, async () => result),
  };
};

describe('a project that is not using Spaces', () => {
  it('does not see the space on an entry', async () => {
    // The column stays — dropping it would lose which tenant owned what — but
    // the Content Manager hands `private` attributes to administrators, so the
    // attribute is taken back off on the way out.
    const { read } = makeStrapi();

    await expect(
      read('api::article.article', { id: 1, title: 'Hi', space: null })
    ).resolves.toEqual({ id: 1, title: 'Hi' });
  });

  it('does not see it on a list either', async () => {
    const { read } = makeStrapi();

    await expect(
      read('api::article.article', { results: [{ id: 1, space: null }], pagination: {} })
    ).resolves.toEqual({ results: [{ id: 1 }], pagination: {} });
  });

  it('does not see it on a populated relation', async () => {
    const { read } = makeStrapi();

    await expect(
      read('api::article.article', { id: 1, author: { id: 2, space: null } })
    ).resolves.toEqual({ id: 1, author: { id: 2 } });
  });

  it('leaves an entry that never had one untouched', async () => {
    const { read } = makeStrapi();
    const entry = { id: 1, title: 'Hi' };

    await expect(read('api::article.article', entry)).resolves.toEqual(entry);
  });

  it('leaves a content type Spaces does not scope entirely alone', async () => {
    // A project may have its own `space` field, and it is none of our business.
    const { read } = makeStrapi({ scoped: [] });
    const entry = { id: 1, space: 'the final frontier' };

    await expect(read('api::mission.mission', entry)).resolves.toEqual(entry);
  });

  it('copes with an operation that returned nothing', async () => {
    const { read } = makeStrapi();

    await expect(read('api::article.article', null)).resolves.toBeNull();
  });
});
