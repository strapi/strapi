import { isEntryValid } from '../index';

/**
 * `isEntryValid` powers the "valid" badge shown in the release UI. It must read
 * `api.documents.strictRelations` and forward it to `validateEntityCreation`, otherwise
 * the UI can mark an entry valid that publish later rejects (issue #24927 / PR #27028).
 */
describe('content-releases utils - isEntryValid', () => {
  const contentTypeUid = 'api::article.article';
  const model = { uid: contentTypeUid };

  const buildStrapi = ({ strictRelations, validate }: any) =>
    ({
      config: {
        get: (key: string, defaultValue: unknown) =>
          key === 'api.documents.strictRelations' ? strictRelations : defaultValue,
      },
      getModel: () => model,
      entityValidator: {
        validateEntityCreation: validate,
      },
      plugin: () => ({ service: () => undefined }),
    }) as any;

  test('forwards strictRelations: true and the entry locale to the validator', async () => {
    const validate = jest.fn().mockResolvedValue({});
    const strapi = buildStrapi({ strictRelations: true, validate });
    const entry = { id: 1, locale: 'en' };

    await isEntryValid(contentTypeUid, entry, { strapi });

    expect(validate).toHaveBeenCalledWith(
      model,
      entry,
      { isDraft: false, locale: 'en', strictRelations: true },
      entry
    );
  });

  test('forwards strictRelations: false when the flag is unset', async () => {
    const validate = jest.fn().mockResolvedValue({});
    const strapi = buildStrapi({ strictRelations: false, validate });
    const entry = { id: 1 };

    await isEntryValid(contentTypeUid, entry, { strapi });

    expect(validate).toHaveBeenCalledWith(
      model,
      entry,
      { isDraft: false, locale: undefined, strictRelations: false },
      entry
    );
  });

  test('returns false when validation throws (flag on, missing required relation)', async () => {
    const validate = jest.fn().mockRejectedValue(new Error('author must be defined.'));
    const strapi = buildStrapi({ strictRelations: true, validate });

    const result = await isEntryValid(contentTypeUid, { id: 1 }, { strapi });

    expect(result).toBe(false);
  });

  test('returns true when validation passes and no workflow gate applies (flag off)', async () => {
    const validate = jest.fn().mockResolvedValue({});
    const strapi = buildStrapi({ strictRelations: false, validate });

    const result = await isEntryValid(contentTypeUid, { id: 1 }, { strapi });

    expect(result).toBe(true);
  });
});
