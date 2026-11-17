import { describe, expect, it } from 'vitest';

import { toFormErrors } from '../toFormErrors';

const refusal = (...errors: Array<{ path: Array<string | number>; message: string }>) => ({
  name: 'ValidationError',
  status: 400,
  message: errors[0]?.message ?? '',
  details: { errors: errors.map((error) => ({ ...error, name: 'ValidationError' })) },
});

describe('toFormErrors', () => {
  it('shows each refusal on the part of the page it names', () => {
    expect(
      toFormErrors(
        refusal(
          { path: ['slug'], message: 'The slug is lowercase letters' },
          { path: ['displayName'], message: 'displayName is the condition’s name' },
          { path: ['subjects'], message: 'subjects is a list of content types' },
          { path: ['query', '$and', 0, 'title'], message: 'title is not a field of api::tag.tag' }
        )
      )
    ).toEqual({
      parts: {
        slug: 'The slug is lowercase letters',
        displayName: 'displayName is the condition’s name',
        subjects: 'subjects is a list of content types',
        filters: 'title is not a field of api::tag.tag',
      },
      others: [],
    });
  });

  it('joins what several rows of Where say', () => {
    expect(
      toFormErrors(
        refusal(
          { path: ['query', '$and', 0, 'views'], message: 'views: $eq takes a number' },
          { path: ['query', '$and', 2, 'title'], message: 'title is a private field' }
        )
      ).parts
    ).toEqual({ filters: 'views: $eq takes a number; title is a private field' });
  });

  it('keeps what names no part of the page apart', () => {
    expect(
      toFormErrors(
        refusal(
          { path: [], message: 'A condition is an object' },
          { path: ['other'], message: 'Unknown key' },
          { path: ['slug'], message: 'Bad slug' }
        )
      )
    ).toEqual({
      parts: { slug: 'Bad slug' },
      others: ['A condition is an object', 'Unknown key'],
    });
  });

  it.each([
    ['an error with no details', { name: 'ForbiddenError', status: 403, message: 'No' }],
    ['details with no errors', { details: { code: 'DEVELOPMENT_ONLY' } }],
    ['no error at all', undefined],
  ])('gives nothing for %s', (_name, error) => {
    expect(toFormErrors(error)).toEqual({ parts: {}, others: [] });
  });

  it('does not place a refusal whose path is not a list', () => {
    expect(toFormErrors({ details: { errors: [{ path: 'slug', message: 'Bad' }] } })).toEqual({
      parts: {},
      others: ['Bad'],
    });
  });
});
