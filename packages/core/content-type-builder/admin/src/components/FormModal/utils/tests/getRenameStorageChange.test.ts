import { describeAttributeStorage, getRenameStorageChange } from '../getRenameStorageChange';

describe('CTB | FormModal | getRenameStorageChange', () => {
  const initial = { name: 'title', type: 'string', status: 'UNCHANGED' as const };

  it('returns null for a name-only change', () => {
    expect(
      getRenameStorageChange(initial, { name: 'heading', type: 'string' }, 'prompt-before-save')
    ).toBeNull();
  });

  it('describes a rename that also changes the type', () => {
    expect(
      getRenameStorageChange(initial, { name: 'heading', type: 'text' }, 'prompt-before-save')
    ).toEqual({ oldName: 'title', newName: 'heading', oldType: 'string', newType: 'text' });
  });

  it("returns null when rename migrations are 'never'", () => {
    expect(getRenameStorageChange(initial, { name: 'heading', type: 'text' }, 'never')).toBeNull();
  });

  it.each(['always', 'prompt-after-edit', 'prompt-before-save'] as const)(
    'warns in %s mode',
    (mode) => {
      expect(
        getRenameStorageChange(initial, { name: 'heading', type: 'text' }, mode)
      ).not.toBeNull();
    }
  );

  it('returns null for a NEW attribute (no data to lose)', () => {
    expect(
      getRenameStorageChange(
        { ...initial, status: 'NEW' },
        { name: 'heading', type: 'text' },
        'prompt-before-save'
      )
    ).toBeNull();
  });

  it('returns null for a type change without a rename', () => {
    expect(
      getRenameStorageChange(initial, { name: 'title', type: 'text' }, 'prompt-before-save')
    ).toBeNull();
  });

  it('describes a relation kind change with a rename', () => {
    const relation = {
      name: 'tags',
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::tag.tag',
      status: 'UNCHANGED' as const,
    };

    expect(
      getRenameStorageChange(
        relation,
        { ...relation, name: 'labels', relation: 'manyToMany' },
        'always'
      )
    ).toEqual({
      oldName: 'tags',
      newName: 'labels',
      oldType: 'relation (oneToMany to api::tag.tag)',
      newType: 'relation (manyToMany to api::tag.tag)',
    });
  });

  it('describes a component change with a rename', () => {
    const component = {
      name: 'hero',
      type: 'component',
      component: 'default.hero',
      repeatable: false,
      status: 'UNCHANGED' as const,
    };

    expect(
      getRenameStorageChange(
        component,
        { ...component, name: 'heroes', repeatable: true },
        'always'
      )
    ).toEqual({
      oldName: 'hero',
      newName: 'heroes',
      oldType: 'component (default.hero)',
      newType: 'component (default.hero, repeatable)',
    });
  });

  it('returns null when either name is missing', () => {
    expect(
      getRenameStorageChange({ type: 'string' }, { name: 'x', type: 'text' }, 'always')
    ).toBeNull();
    expect(getRenameStorageChange(initial, { type: 'text' }, 'always')).toBeNull();
  });

  describe('describeAttributeStorage', () => {
    it('falls back to the bare type', () => {
      expect(describeAttributeStorage({ type: 'relation' })).toBe('relation');
      expect(describeAttributeStorage({ type: 'component' })).toBe('component');
      expect(describeAttributeStorage({})).toBe('unknown');
    });
  });
});
