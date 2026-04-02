import {
  assertReadDraftPermission,
  getReadDraftActionForUid,
  parseContentApiUidParts,
  queryRequiresDraftReadPermission,
} from '../read-draft-permission';
import { ForbiddenError } from '../errors';

const dpModel = {
  uid: 'api::article.article',
  options: { draftAndPublish: true },
} as any;

const noDpModel = {
  uid: 'api::tag.tag',
  options: { draftAndPublish: false },
} as any;

describe('parseContentApiUidParts', () => {
  it('parses api UIDs', () => {
    expect(parseContentApiUidParts('api::article.article')).toEqual({
      apiKey: 'api::article',
      controllerName: 'article',
    });
    expect(parseContentApiUidParts('api::blog.post')).toEqual({
      apiKey: 'api::blog',
      controllerName: 'post',
    });
  });

  it('parses plugin UIDs', () => {
    expect(parseContentApiUidParts('plugin::foo.bar')).toEqual({
      apiKey: 'plugin::foo',
      controllerName: 'bar',
    });
  });

  it('returns null for invalid UIDs', () => {
    expect(parseContentApiUidParts('bad')).toBeNull();
    expect(parseContentApiUidParts('api::onlyone')).toBeNull();
  });
});

describe('getReadDraftActionForUid', () => {
  it('suffixes readDraft', () => {
    expect(getReadDraftActionForUid('api::article.article')).toBe('api::article.article.readDraft');
  });
});

describe('queryRequiresDraftReadPermission', () => {
  it('is false without draft & publish', () => {
    expect(queryRequiresDraftReadPermission({}, noDpModel)).toBe(false);
  });

  it('is true for draft & publish when status is omitted or draft', () => {
    expect(queryRequiresDraftReadPermission({}, dpModel)).toBe(true);
    expect(queryRequiresDraftReadPermission({ status: 'draft' }, dpModel)).toBe(true);
    expect(queryRequiresDraftReadPermission({ status: 'DRAFT' }, dpModel)).toBe(true);
  });

  it('is false when status is published', () => {
    expect(queryRequiresDraftReadPermission({ status: 'published' }, dpModel)).toBe(false);
    expect(queryRequiresDraftReadPermission({ status: 'PUBLISHED' }, dpModel)).toBe(false);
  });
});

describe('assertReadDraftPermission', () => {
  const abilityAllow = { can: (a: string) => a === 'api::article.article.readDraft' };
  const abilityDeny = { can: () => false };

  it('no-ops without ability', () => {
    expect(() => assertReadDraftPermission({ status: 'draft' }, dpModel, undefined)).not.toThrow();
  });

  it('allows when ability permits readDraft', () => {
    expect(() =>
      assertReadDraftPermission({ status: 'draft' }, dpModel, { ability: abilityAllow })
    ).not.toThrow();
  });

  it('throws when ability denies readDraft', () => {
    expect(() =>
      assertReadDraftPermission({ status: 'draft' }, dpModel, { ability: abilityDeny })
    ).toThrow(ForbiddenError);
  });

  it('does not throw for published-only query', () => {
    expect(() =>
      assertReadDraftPermission({ status: 'published' }, dpModel, { ability: abilityDeny })
    ).not.toThrow();
  });
});
