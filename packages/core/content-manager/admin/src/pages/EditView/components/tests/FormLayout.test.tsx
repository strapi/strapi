import { hasMountSideEffects } from '../FormLayout';

type Attribute = Parameters<typeof hasMountSideEffects>[0];
type Components = Parameters<typeof hasMountSideEffects>[1];

const attribute = (value: Record<string, unknown>) => value as unknown as Attribute;

const components = {
  'shared.with-custom-field': {
    attributes: {
      color: { type: 'customField', customField: 'plugin::color-picker.color' },
    },
  },
  'shared.nested': {
    attributes: {
      inner: { type: 'component', component: 'shared.with-custom-field', repeatable: false },
    },
  },
  'shared.plain': {
    attributes: {
      label: { type: 'string' },
    },
  },
} as unknown as Components;

describe('hasMountSideEffects', () => {
  it('mounts a required UID right away, as it fetches its default value on mount', () => {
    expect(hasMountSideEffects(attribute({ type: 'uid', required: true }), components)).toBe(true);
    expect(hasMountSideEffects(attribute({ type: 'uid' }), components)).toBe(false);
  });

  it('mounts custom fields right away, as they may set a value on mount', () => {
    expect(
      hasMountSideEffects(
        attribute({ type: 'string', customField: 'plugin::color-picker.color' }),
        components
      )
    ).toBe(true);
  });

  it('looks into non-repeatable components, which are expanded by default', () => {
    expect(
      hasMountSideEffects(
        attribute({ type: 'component', component: 'shared.nested', repeatable: false }),
        components
      )
    ).toBe(true);
    expect(
      hasMountSideEffects(
        attribute({ type: 'component', component: 'shared.plain', repeatable: false }),
        components
      )
    ).toBe(false);
  });

  it('ignores repeatable components and other fields, which can be mounted lazily', () => {
    expect(
      hasMountSideEffects(
        attribute({ type: 'component', component: 'shared.with-custom-field', repeatable: true }),
        components
      )
    ).toBe(false);
    expect(hasMountSideEffects(attribute({ type: 'string' }), components)).toBe(false);
  });
});
