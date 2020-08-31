import removePublishedAtFromMetas from '../removePublishedAtFromMetas';

describe('CONTENT MANAGER | utils | removePublishedAtFromMetas', () => {
  it('should remove the published_at key from the given object', () => {
    const data = {
      ok: true,
      published_at: true,
    };

    expect(removePublishedAtFromMetas(data)).toEqual({ ok: true });
  });
});
