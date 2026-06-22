import * as is from '../attributes';

describe('attribute builders', () => {
  it('builds a string attribute and merges options', () => {
    expect(is.string()).toEqual({ type: 'string' });
    expect(is.string({ required: true })).toEqual({ type: 'string', required: true });
  });

  it('builds primitive attributes with the right type tag', () => {
    expect(is.text()).toEqual({ type: 'text' });
    expect(is.integer({ min: 0 })).toEqual({ type: 'integer', min: 0 });
    expect(is.boolean({ default: false })).toEqual({ type: 'boolean', default: false });
    expect(is.datetime()).toEqual({ type: 'datetime' });
    expect(is.json()).toEqual({ type: 'json' });
    expect(is.email({ required: true })).toEqual({ type: 'email', required: true });
    expect(is.uid({ targetField: 'title' })).toEqual({ type: 'uid', targetField: 'title' });
  });

  it('builds an enumeration with values', () => {
    expect(is.enumeration({ enum: ['a', 'b'] })).toEqual({
      type: 'enumeration',
      enum: ['a', 'b'],
    });
  });

  it('builds a media attribute', () => {
    expect(is.media({ multiple: true })).toEqual({ type: 'media', multiple: true });
  });

  it('builds a component attribute', () => {
    expect(is.component({ component: 'default.seo', repeatable: true })).toEqual({
      type: 'component',
      component: 'default.seo',
      repeatable: true,
    });
  });

  it('builds a relation attribute', () => {
    expect(is.relation({ relation: 'oneToMany', target: 'api::tag.tag' })).toEqual({
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::tag.tag',
    });
  });

  it('does not share mutable state between calls', () => {
    const a = is.string({ required: true });
    const b = is.string();

    expect(a).not.toBe(b);
    expect(b).toEqual({ type: 'string' });
  });
});
