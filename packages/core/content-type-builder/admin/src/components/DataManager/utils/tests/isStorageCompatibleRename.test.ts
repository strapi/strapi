import { isStorageCompatibleRename } from '../isStorageCompatibleRename';

import type { AnyAttribute } from '../../../../types';

const string = (name: string): AnyAttribute => ({ name, type: 'string' });
const text = (name: string): AnyAttribute => ({ name, type: 'text' });

const relation = (name: string, extra: Partial<AnyAttribute> = {}): AnyAttribute =>
  ({
    name,
    type: 'relation',
    relation: 'oneToMany',
    target: 'api::tag.tag',
    ...extra,
  }) as AnyAttribute;

const component = (name: string, extra: Partial<AnyAttribute> = {}): AnyAttribute =>
  ({
    name,
    type: 'component',
    component: 'default.hero',
    repeatable: false,
    ...extra,
  }) as AnyAttribute;

describe('CTB | DataManager | isStorageCompatibleRename', () => {
  it('accepts a rename that keeps the same type', () => {
    expect(isStorageCompatibleRename(string('title'), string('heading'))).toBe(true);
  });

  it('rejects a type change (string -> text)', () => {
    expect(isStorageCompatibleRename(string('title'), text('heading'))).toBe(false);
  });

  it('rejects a relation kind change', () => {
    expect(
      isStorageCompatibleRename(relation('tags'), relation('labels', { relation: 'manyToMany' }))
    ).toBe(false);
  });

  it('rejects a relation target change', () => {
    expect(
      isStorageCompatibleRename(
        relation('tags'),
        relation('labels', { target: 'api::label.label' })
      )
    ).toBe(false);
  });

  it('accepts a relation rename that keeps kind and target', () => {
    expect(isStorageCompatibleRename(relation('tags'), relation('labels'))).toBe(true);
  });

  it('rejects a component uid change', () => {
    expect(
      isStorageCompatibleRename(
        component('hero'),
        component('banner', { component: 'default.banner' })
      )
    ).toBe(false);
  });

  it('rejects a repeatable change', () => {
    expect(
      isStorageCompatibleRename(component('hero'), component('heroes', { repeatable: true }))
    ).toBe(false);
  });

  it('treats a missing repeatable flag as false', () => {
    const { repeatable: _unused, ...withoutRepeatable } = component('hero') as AnyAttribute & {
      repeatable?: boolean;
    };
    expect(isStorageCompatibleRename(component('hero'), withoutRepeatable as AnyAttribute)).toBe(
      true
    );
  });
});
