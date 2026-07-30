import { stampSpaceOnCreate } from '../lifecycles';

const makeStrapi = (spaceId: number | undefined) =>
  ({
    requestContext: {
      get: () => (spaceId === undefined ? undefined : { state: { spaceId } }),
    },
  }) as any;

describe('stampSpaceOnCreate', () => {
  it('sets data.space from the request context when missing', () => {
    const strapi = makeStrapi(7);
    const event = { params: { data: { title: 'Hello' } } };

    stampSpaceOnCreate(strapi, event);

    expect(event.params.data).toEqual({ title: 'Hello', space: 7 });
  });

  it('does not overwrite an explicitly-provided space', () => {
    const strapi = makeStrapi(7);
    const event = { params: { data: { title: 'Hello', space: 99 } } };

    stampSpaceOnCreate(strapi, event);

    expect(event.params.data.space).toBe(99);
  });

  it('is a no-op when no spaceId is on the request context', () => {
    const strapi = makeStrapi(undefined);
    const event = { params: { data: { title: 'Hello' } } };

    stampSpaceOnCreate(strapi, event);

    expect(event.params.data.space).toBeUndefined();
  });

  it('is a no-op when params.data is missing', () => {
    const strapi = makeStrapi(7);
    const event = { params: {} };

    expect(() => stampSpaceOnCreate(strapi, event)).not.toThrow();
  });

  it('treats null space as a value (does not overwrite)', () => {
    const strapi = makeStrapi(7);
    const event = { params: { data: { title: 'Hello', space: null as any } } };

    stampSpaceOnCreate(strapi, event);

    // null is an explicit choice — we only fill when truly absent (undefined).
    expect(event.params.data.space).toBeNull();
  });
});
