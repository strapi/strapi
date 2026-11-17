import { describe, expect, it } from 'vitest';
import type { Core } from '@strapi/types';

import { hasRequestState, setPendingProfile, takePendingProfile } from '../pending-profile';

const inRequest = (state: Record<string, unknown> = {}) =>
  ({ requestContext: { get: () => ({ state }) } }) as unknown as Core.Strapi;

const outsideRequest = () =>
  ({ requestContext: { get: () => undefined } }) as unknown as Core.Strapi;

describe('pending profile', () => {
  it('is left on a request and taken from it', () => {
    const strapi = inRequest();

    setPendingProfile(strapi, { fields: { company: 'Acme' } });

    expect(takePendingProfile(strapi)).toEqual({ fields: { company: 'Acme' } });
  });

  it('is taken once: a second read finds nothing', () => {
    const strapi = inRequest();

    setPendingProfile(strapi, { fields: { company: 'Acme' } });
    takePendingProfile(strapi);

    expect(takePendingProfile(strapi)).toBeUndefined();
  });

  it('is the request`s own: another request does not see it', () => {
    const first = inRequest();
    const second = inRequest();

    setPendingProfile(first, { fields: { company: 'Acme' } });

    expect(takePendingProfile(second)).toBeUndefined();
    expect(takePendingProfile(first)).toEqual({ fields: { company: 'Acme' } });
  });

  it('is nothing where there is no request', () => {
    const strapi = outsideRequest();

    setPendingProfile(strapi, { fields: { company: 'Acme' } });

    expect(hasRequestState(strapi)).toBe(false);
    expect(takePendingProfile(strapi)).toBeUndefined();
  });

  it('knows whether there is a request to leave it on', () => {
    expect(hasRequestState(inRequest())).toBe(true);
    expect(hasRequestState({} as Core.Strapi)).toBe(false);
  });
});
