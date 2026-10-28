import { errors } from '@strapi/utils';

import { formatApplicationError } from '../../errors';
import { assertBaseVersionCurrent, prepareBaseVersionCheck } from '../base-version';

const LOADED = '2026-01-01T00:00:00.000Z';
const NEWER = '2026-01-02T00:00:00.000Z';

describe('document baseVersion checks', () => {
  it('does not conflict when the content type has no draft and publish', () => {
    expect(prepareBaseVersionCheck(false, LOADED)).toBeNull();
    expect(prepareBaseVersionCheck(false, NEWER)).toBeNull();
    expect(prepareBaseVersionCheck(false, undefined)).toBeNull();
  });

  it('returns 409 when a draft and publish document changed since it was loaded', () => {
    const expected = prepareBaseVersionCheck(true, LOADED);

    expect(expected).toBe(LOADED);

    let caught: unknown;

    try {
      assertBaseVersionCurrent({
        expected: expected!,
        currentUpdatedAt: NEWER,
        documentId: 'doc-1',
        locale: 'en',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(errors.ConflictError);
    expect(
      formatApplicationError(caught as InstanceType<typeof errors.ApplicationError>)
    ).toMatchObject({
      status: 409,
      body: {
        error: {
          status: 409,
          name: 'ConflictError',
          details: {
            expected: LOADED,
            current: NEWER,
          },
        },
      },
    });
  });

  it('accepts a draft and publish save that still matches the loaded version', () => {
    const expected = prepareBaseVersionCheck(true, LOADED);

    expect(() =>
      assertBaseVersionCurrent({
        expected: expected!,
        currentUpdatedAt: LOADED,
        documentId: 'doc-1',
      })
    ).not.toThrow();
  });

  it('skips the check when a draft and publish save does not send baseVersion', () => {
    expect(prepareBaseVersionCheck(true, undefined)).toBeNull();
  });
});
