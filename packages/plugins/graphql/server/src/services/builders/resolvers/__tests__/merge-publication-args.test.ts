import { mergePublicationFilterFromGraphQLArgs } from '../merge-publication-args';

describe('mergePublicationFilterFromGraphQLArgs', () => {
  it('returns publicationFilter when set (GraphQL internal values are kebab-case strings)', () => {
    expect(
      mergePublicationFilterFromGraphQLArgs({
        publicationFilter: 'never-published',
      })
    ).toEqual({ publicationFilter: 'never-published' });

    expect(
      mergePublicationFilterFromGraphQLArgs({
        publicationFilter: 'published-with-draft',
      })
    ).toEqual({ publicationFilter: 'published-with-draft' });
  });

  it('prefers publicationFilter over deprecated hasPublishedVersion', () => {
    expect(
      mergePublicationFilterFromGraphQLArgs({
        publicationFilter: 'modified',
        hasPublishedVersion: false,
      })
    ).toEqual({ publicationFilter: 'modified' });
  });

  it('maps hasPublishedVersion true/false to document-scoped publicationFilter modes', () => {
    expect(
      mergePublicationFilterFromGraphQLArgs({
        hasPublishedVersion: true,
      })
    ).toEqual({ publicationFilter: 'has-published-version-document' });

    expect(
      mergePublicationFilterFromGraphQLArgs({
        hasPublishedVersion: false,
      })
    ).toEqual({ publicationFilter: 'never-published-document' });
  });

  it('returns {} when neither publication arg is present', () => {
    expect(mergePublicationFilterFromGraphQLArgs({})).toEqual({});
    expect(mergePublicationFilterFromGraphQLArgs({ status: 'DRAFT' })).toEqual({});
  });
});
