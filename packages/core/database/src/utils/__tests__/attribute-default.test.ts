import { getScalarAttributeDefault } from '../attribute-default';

describe('getScalarAttributeDefault', () => {
  it('returns boolean false defaults', () => {
    expect(getScalarAttributeDefault({ type: 'boolean', default: false })).toBe(false);
  });

  it('returns numeric zero defaults', () => {
    expect(getScalarAttributeDefault({ type: 'integer', default: 0 })).toBe(0);
  });

  it('returns string defaults', () => {
    expect(getScalarAttributeDefault({ type: 'string', default: 'draft' })).toBe('draft');
  });

  it('skips empty string defaults', () => {
    expect(getScalarAttributeDefault({ type: 'string', default: '' })).toBeUndefined();
  });

  it('skips function defaults', () => {
    expect(getScalarAttributeDefault({ type: 'uid', default: () => 'generated' })).toBeUndefined();
  });

  it('returns undefined when no default is configured', () => {
    expect(getScalarAttributeDefault({ type: 'string' })).toBeUndefined();
  });
});
