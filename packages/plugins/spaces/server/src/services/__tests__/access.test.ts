import { assertWritable, decideAccess, resolvePlacement } from '../access';

const ARTICLE = { uid: 'api::article.article', pluginOptions: {} };
const GLOSSARY = {
  uid: 'api::glossary.glossary',
  pluginOptions: { spaces: { sharedEntries: true } },
};
const TAG = {
  uid: 'api::tag.tag',
  pluginOptions: { spaces: { sharedEntries: true, sharedEditable: true } },
};

const DEFAULT = { id: 1, slug: 'default', isDefault: true };
const ACME = { id: 2, slug: 'acme', isDefault: false };

describe('decideAccess', () => {
  it.each([
    // exclusive content type
    ['exclusive', 'no header', ARTICLE, undefined, 3, { visible: true, editable: true }],
    ['exclusive', 'default', ARTICLE, DEFAULT, 3, { visible: true, editable: true }],
    ['exclusive', 'default', ARTICLE, DEFAULT, null, { visible: true, editable: true }],
    ['exclusive', 'acme', ARTICLE, ACME, 2, { visible: true, editable: true }],
    [
      'exclusive',
      'acme',
      ARTICLE,
      ACME,
      null,
      { visible: true, editable: false, reason: 'shared-entry' },
    ],
    [
      'exclusive',
      'acme',
      ARTICLE,
      ACME,
      3,
      { visible: false, editable: false, reason: 'other-workspace' },
    ],
    // shared content type
    ['shared', 'default', GLOSSARY, DEFAULT, null, { visible: true, editable: true }],
    [
      'shared',
      'acme',
      GLOSSARY,
      ACME,
      null,
      { visible: true, editable: false, reason: 'shared-content-type' },
    ],
    [
      'shared',
      'acme',
      GLOSSARY,
      ACME,
      2,
      { visible: true, editable: false, reason: 'shared-content-type' },
    ],
    // shared-editable content type
    ['shared-editable', 'acme', TAG, ACME, null, { visible: true, editable: true }],
    ['shared-editable', 'acme', TAG, ACME, 3, { visible: true, editable: true }],
  ])('%s CT, %s caller, row %p → %p', (_kind, _caller, model, request, entrySpaceId, expected) => {
    // `isOverride` / `canOverride` are inheritance detail, covered on their own
    // below; this table is about who may see and write what.
    expect(
      decideAccess({ model, request, entrySpaceId: entrySpaceId as number | null })
    ).toMatchObject(expected);
  });
});

describe('assertWritable', () => {
  it('returns the decision when editable', () => {
    expect(assertWritable({ model: ARTICLE, request: ACME, entrySpaceId: 2 })).toMatchObject({
      visible: true,
      editable: true,
    });
  });

  it('throws 403 with the reason for a visible but read-only row', () => {
    expect(() => assertWritable({ model: ARTICLE, request: ACME, entrySpaceId: null })).toThrow(
      expect.objectContaining({
        name: 'WorkspaceAccessError',
        message: expect.stringContaining('shared across workspaces'),
        details: { reason: 'shared-entry' },
      })
    );
    expect(() => assertWritable({ model: GLOSSARY, request: ACME, entrySpaceId: null })).toThrow(
      expect.objectContaining({ details: { reason: 'shared-content-type' } })
    );
  });

  it('throws 404 for an invisible row', () => {
    expect(() => assertWritable({ model: ARTICLE, request: ACME, entrySpaceId: 3 })).toThrow(
      expect.objectContaining({ name: 'NotFoundError' })
    );
  });
});

/**
 * An inherited document a workspace has overridden exists twice under one
 * documentId — the shared original and that workspace's copy. Everything that
 * looks a document up outside a scoped read has to pick the same one the read
 * net would, or it picks whichever row came back first.
 */
describe('resolvePlacement', () => {
  const SHARED = { spaceId: null, isOverride: false };
  const ACME_COPY = { spaceId: 2, isOverride: true };
  const ACME_OWN = { spaceId: 2, isOverride: false };
  const GLOBEX_COPY = { spaceId: 3, isOverride: true };

  it('gives a workspace its own copy over the original', () => {
    expect(resolvePlacement([SHARED, ACME_COPY], 2)).toEqual(ACME_COPY);
  });

  it('gives a workspace the original when it has no copy', () => {
    expect(resolvePlacement([SHARED, GLOBEX_COPY], 2)).toEqual(SHARED);
  });

  it('gives the default workspace the original, never someone else’s copy', () => {
    expect(resolvePlacement([SHARED, ACME_COPY, GLOBEX_COPY], undefined)).toEqual(SHARED);
  });

  it('gives a workspace its own entry', () => {
    expect(resolvePlacement([ACME_OWN], 2)).toEqual(ACME_OWN);
  });

  /**
   * Falls back to a row that is not a copy so the caller can tell "another
   * workspace's entry" (404, and say so) from "no such document".
   */
  it('still answers for a document that lives only in another workspace', () => {
    expect(resolvePlacement([ACME_OWN], 3)).toEqual(ACME_OWN);
  });

  it('never answers with another workspace’s copy', () => {
    expect(resolvePlacement([ACME_COPY], 3)).toBeUndefined();
  });

  it('answers nothing for a document that does not exist', () => {
    expect(resolvePlacement([], 2)).toBeUndefined();
  });
});
