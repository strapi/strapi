import { reducer, actions, type State } from '../reducer';

import { initCT, init } from './utils';

import type { AnyAttribute, RenameHop } from '../../../types';
import type { Internal } from '@strapi/types';

const editName = (
  uid: string,
  name: string,
  newName: string,
  extra: Record<string, unknown> = {}
) =>
  actions.editAttribute({
    attributeToSet: { type: 'string', name: newName, ...extra } as AnyAttribute,
    forTarget: 'contentType',
    targetUid: uid as Internal.UID.ContentType,
    name,
  });

const getRenames = (state: State, uid: string): RenameHop[] | undefined =>
  state.current.contentTypes[uid]?.renames;

const getAttr = (state: State, uid: string, name: string) =>
  state.current.contentTypes[uid]?.attributes.find((attr) => attr.name === name);

describe('CTB | DataManager | reducer | rename tracking (EDIT_ATTRIBUTE)', () => {
  const uid = 'api::article.article';

  const buildState = (attributes: AnyAttribute[]) =>
    init({ contentTypes: { [uid]: initCT('article', { attributes }) } });

  it('records an ordered rename hop when an existing attribute is renamed', () => {
    const state = reducer(
      buildState([{ name: 'title', type: 'string', status: 'UNCHANGED' }]),
      editName(uid, 'title', 'heading')
    );

    expect(getRenames(state, uid)).toEqual([{ oldName: 'title', newName: 'heading' }]);
  });

  it('does NOT record a rename when a NEW attribute is renamed (no data yet)', () => {
    const state = reducer(
      buildState([{ name: 'title', type: 'string', status: 'NEW' }]),
      editName(uid, 'title', 'heading')
    );

    expect(getRenames(state, uid)).toBeUndefined();
  });

  it('records every hop in order across successive renames (a -> b -> c)', () => {
    let state = reducer(
      buildState([{ name: 'a', type: 'string', status: 'UNCHANGED' }]),
      editName(uid, 'a', 'b')
    );
    state = reducer(state, editName(uid, 'b', 'c'));

    expect(getRenames(state, uid)).toEqual([
      { oldName: 'a', newName: 'b' },
      { oldName: 'b', newName: 'c' },
    ]);
    expect(getAttr(state, uid, 'c')).toMatchObject({ name: 'c' });
  });

  it('records the full path even when renamed back to the original (a -> b -> a)', () => {
    let state = reducer(
      buildState([{ name: 'a', type: 'string', status: 'UNCHANGED' }]),
      editName(uid, 'a', 'b')
    );
    state = reducer(state, editName(uid, 'b', 'a'));

    // The migration will replay a->b then b->a, a runtime no-op that preserves data.
    expect(getRenames(state, uid)).toEqual([
      { oldName: 'a', newName: 'b' },
      { oldName: 'b', newName: 'a' },
    ]);
  });

  it('records a user-routed swap path verbatim (a -> tmp, b -> a, tmp -> b)', () => {
    let state = reducer(
      buildState([
        { name: 'a', type: 'string', status: 'UNCHANGED' },
        { name: 'b', type: 'string', status: 'UNCHANGED' },
      ]),
      editName(uid, 'a', 'tmp')
    );
    state = reducer(state, editName(uid, 'b', 'a'));
    state = reducer(state, editName(uid, 'tmp', 'b'));

    expect(getRenames(state, uid)).toEqual([
      { oldName: 'a', newName: 'tmp' },
      { oldName: 'b', newName: 'a' },
      { oldName: 'tmp', newName: 'b' },
    ]);
  });

  it('records a collision-free reuse path in edit order (a -> c, b -> a, a -> b)', () => {
    let state = reducer(
      buildState([
        { name: 'a', type: 'string', status: 'UNCHANGED' },
        { name: 'b', type: 'string', status: 'UNCHANGED' },
      ]),
      editName(uid, 'a', 'c')
    );
    state = reducer(state, editName(uid, 'b', 'a'));
    state = reducer(state, editName(uid, 'a', 'b'));

    expect(getRenames(state, uid)).toEqual([
      { oldName: 'a', newName: 'c' },
      { oldName: 'b', newName: 'a' },
      { oldName: 'a', newName: 'b' },
    ]);
  });

  it('does not record a declined per-edit migration', () => {
    const state = reducer(
      buildState([{ name: 'title', type: 'string', status: 'UNCHANGED' }]),
      actions.editAttribute({
        attributeToSet: { type: 'string', name: 'heading' } as AnyAttribute,
        forTarget: 'contentType',
        targetUid: uid as Internal.UID.ContentType,
        name: 'title',
        recordRename: false,
      })
    );

    expect(getRenames(state, uid)).toBeUndefined();
    expect(getAttr(state, uid, 'heading')).toBeDefined();
  });

  it('does not record a rename when the type changes in the same edit', () => {
    // string -> integer: the column cannot simply be renamed (the type change
    // would then be applied in place by schema sync, which Postgres may reject),
    // so the legacy drop-and-recreate path is used and no hop is recorded.
    const state = reducer(
      buildState([{ name: 'title', type: 'string', status: 'UNCHANGED' }]),
      actions.editAttribute({
        attributeToSet: { type: 'integer', name: 'views' } as AnyAttribute,
        forTarget: 'contentType',
        targetUid: uid as Internal.UID.ContentType,
        name: 'title',
      })
    );

    expect(getRenames(state, uid)).toBeUndefined();
    expect(getAttr(state, uid, 'views')).toMatchObject({ type: 'integer' });
  });

  it('does not record a relation rename when the relation kind or target changes', () => {
    const relation = {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::tag.tag',
      targetAttribute: null,
    } as const;
    const edit = (attributeToSet: Record<string, unknown>) =>
      actions.editAttribute({
        attributeToSet: { ...relation, name: 'labels', ...attributeToSet } as AnyAttribute,
        forTarget: 'contentType',
        targetUid: uid as Internal.UID.ContentType,
        name: 'tags',
      });
    // One-way relations still resolve their target type in the reducer.
    const withRelation = () =>
      init({
        contentTypes: {
          [uid]: initCT('article', {
            attributes: [{ ...relation, name: 'tags', status: 'UNCHANGED' } as AnyAttribute],
          }),
          'api::tag.tag': initCT('tag', { attributes: [] }),
          'api::label.label': initCT('label', { attributes: [] }),
        },
      });

    expect(getRenames(reducer(withRelation(), edit({})), uid)).toEqual([
      { oldName: 'tags', newName: 'labels' },
    ]);
    expect(
      getRenames(reducer(withRelation(), edit({ target: 'api::label.label' })), uid)
    ).toBeUndefined();
    expect(
      getRenames(reducer(withRelation(), edit({ relation: 'oneToOne' })), uid)
    ).toBeUndefined();
  });

  it('does not record a component rename when the component or repeatable flag changes', () => {
    const component = { type: 'component', component: 'default.hero', repeatable: false } as const;
    const edit = (attributeToSet: Record<string, unknown>) =>
      actions.editAttribute({
        attributeToSet: { ...component, name: 'banner', ...attributeToSet } as AnyAttribute,
        forTarget: 'contentType',
        targetUid: uid as Internal.UID.ContentType,
        name: 'hero',
      });
    const withComponent = () =>
      buildState([{ ...component, name: 'hero', status: 'UNCHANGED' } as AnyAttribute]);

    expect(getRenames(reducer(withComponent(), edit({})), uid)).toEqual([
      { oldName: 'hero', newName: 'banner' },
    ]);
    expect(getRenames(reducer(withComponent(), edit({ repeatable: true })), uid)).toBeUndefined();
    expect(
      getRenames(reducer(withComponent(), edit({ component: 'default.banner' })), uid)
    ).toBeUndefined();
  });

  it('does not record a rename when editing other props without a name change', () => {
    const state = reducer(
      buildState([{ name: 'title', type: 'string', status: 'UNCHANGED' }]),
      editName(uid, 'title', 'title', { required: true })
    );

    expect(getRenames(state, uid)).toBeUndefined();
  });

  describe('declined renames (prompt-after-edit)', () => {
    const declineName = (name: string, newName: string) =>
      actions.editAttribute({
        attributeToSet: { type: 'string', name: newName } as AnyAttribute,
        forTarget: 'contentType',
        targetUid: uid as Internal.UID.ContentType,
        name,
        recordRename: false,
        declineRename: true,
      });

    const getDeclined = (state: State) => state.current.contentTypes[uid]?.declinedRenameNames;

    it('remembers both names of a declined hop instead of recording it', () => {
      const state = reducer(
        buildState([{ name: 'title', type: 'string', status: 'UNCHANGED' }]),
        declineName('title', 'tmp')
      );

      expect(getRenames(state, uid)).toBeUndefined();
      expect(getDeclined(state)).toEqual(['title', 'tmp']);
      expect(getAttr(state, uid, 'tmp')).toBeDefined();
    });

    it('deduplicates names across declined hops of the same chain', () => {
      let state = reducer(
        buildState([{ name: 'title', type: 'string', status: 'UNCHANGED' }]),
        declineName('title', 'tmp')
      );
      state = reducer(state, declineName('tmp', 'heading'));

      expect(getDeclined(state)).toEqual(['title', 'tmp', 'heading']);
    });

    it('ignores a declined edit that does not change the name', () => {
      const state = reducer(
        buildState([{ name: 'title', type: 'string', status: 'UNCHANGED' }]),
        declineName('title', 'title')
      );

      expect(getDeclined(state)).toBeUndefined();
    });

    it('declines a custom field rename the same way', () => {
      const state = reducer(
        buildState([
          { name: 'color', type: 'string', customField: 'plugin::x.color', status: 'UNCHANGED' },
        ]),
        actions.editCustomFieldAttribute({
          attributeToSet: {
            type: 'string',
            name: 'shade',
            customField: 'plugin::x.color',
          } as AnyAttribute,
          forTarget: 'contentType',
          targetUid: uid as Internal.UID.ContentType,
          name: 'color',
          recordRename: false,
          declineRename: true,
        })
      );

      expect(getRenames(state, uid)).toBeUndefined();
      expect(getDeclined(state)).toEqual(['color', 'shade']);
    });
  });

  describe('counterpart renames (other side of a bidirectional relation)', () => {
    const tagUid = 'api::tag.tag';
    // `article.tags` owns the join table, `tag.articles` is the inverse side.
    const tags = {
      name: 'tags',
      type: 'relation',
      relation: 'manyToMany',
      target: tagUid,
      targetAttribute: 'articles',
    };
    const articles = {
      name: 'articles',
      type: 'relation',
      relation: 'manyToMany',
      target: uid,
      targetAttribute: 'tags',
    };

    const withRelation = (status: 'UNCHANGED' | 'NEW' = 'UNCHANGED') =>
      init({
        contentTypes: {
          [uid]: initCT('article', { attributes: [{ ...tags, status } as AnyAttribute] }),
          [tagUid]: initCT('tag', { attributes: [{ ...articles, status } as AnyAttribute] }),
          'api::label.label': initCT('label', { attributes: [] }),
        },
      });

    const edit = (
      targetUid: string,
      attribute: Record<string, unknown>,
      attributeToSet: Record<string, unknown>,
      consent: Record<string, boolean> = {}
    ) =>
      actions.editAttribute({
        attributeToSet: { ...attribute, ...attributeToSet } as AnyAttribute,
        forTarget: 'contentType',
        targetUid: targetUid as Internal.UID.ContentType,
        name: attribute.name as string,
        ...consent,
      });

    it('records the hop on the owning type when renamed from the inverse side', () => {
      const state = reducer(withRelation(), edit(tagUid, articles, { targetAttribute: 'labels' }));

      expect(getRenames(state, uid)).toEqual([{ oldName: 'tags', newName: 'labels' }]);
      expect(getRenames(state, tagUid)).toBeUndefined();
      expect(getAttr(state, uid, 'labels')).toMatchObject({ targetAttribute: 'articles' });
    });

    it('records the hop on the inverse type when renamed from the owning side', () => {
      const state = reducer(withRelation(), edit(uid, tags, { targetAttribute: 'posts' }));

      expect(getRenames(state, tagUid)).toEqual([{ oldName: 'articles', newName: 'posts' }]);
      expect(getRenames(state, uid)).toBeUndefined();
    });

    it('does not record a hop when the counterpart is NEW', () => {
      const state = reducer(
        withRelation('NEW'),
        edit(tagUid, articles, { targetAttribute: 'labels' })
      );

      expect(getRenames(state, uid)).toBeUndefined();
    });

    it('does not record a hop when the relation kind or target changes', () => {
      const kind = reducer(
        withRelation(),
        edit(tagUid, articles, { targetAttribute: 'labels', relation: 'oneToMany' })
      );
      expect(getRenames(kind, uid)).toBeUndefined();

      const target = reducer(
        withRelation(),
        edit(tagUid, articles, { targetAttribute: 'labels', target: 'api::label.label' })
      );
      expect(getRenames(target, uid)).toBeUndefined();
      expect(getRenames(target, 'api::label.label')).toBeUndefined();
    });

    it('remembers a declined counterpart rename on the target type', () => {
      const state = reducer(
        withRelation(),
        edit(tagUid, articles, { targetAttribute: 'labels' }, { declineTargetRename: true })
      );

      expect(getRenames(state, uid)).toBeUndefined();
      expect(state.current.contentTypes[uid].declinedRenameNames).toEqual(['tags', 'labels']);
      expect(state.current.contentTypes[tagUid].declinedRenameNames).toBeUndefined();
    });

    it('records one hop on each type when the field and its counterpart are renamed', () => {
      const state = reducer(
        withRelation(),
        edit(tagUid, articles, { name: 'posts', targetAttribute: 'labels' })
      );

      expect(getRenames(state, tagUid)).toEqual([{ oldName: 'articles', newName: 'posts' }]);
      expect(getRenames(state, uid)).toEqual([{ oldName: 'tags', newName: 'labels' }]);
    });

    it('records both hops on a self-referencing type, own rename first', () => {
      const parent = {
        name: 'parent',
        type: 'relation',
        relation: 'manyToOne',
        target: uid,
        targetAttribute: 'children',
      };
      const children = {
        name: 'children',
        type: 'relation',
        relation: 'oneToMany',
        target: uid,
        targetAttribute: 'parent',
      };
      const state = reducer(
        buildState([
          { ...parent, status: 'UNCHANGED' } as AnyAttribute,
          { ...children, status: 'UNCHANGED' } as AnyAttribute,
        ]),
        edit(uid, parent, { name: 'owner', targetAttribute: 'items' })
      );

      expect(getRenames(state, uid)).toEqual([
        { oldName: 'parent', newName: 'owner' },
        { oldName: 'children', newName: 'items' },
      ]);
    });
  });

  describe('uid fields attached to the renamed field', () => {
    const slug = { name: 'slug', type: 'uid', targetField: 'title', status: 'UNCHANGED' };

    const getTargetField = (state: State, name = 'slug') =>
      (getAttr(state, uid, name) as { targetField?: string } | undefined)?.targetField;

    it('points the uid at the new name when its target field is renamed', () => {
      const state = reducer(
        buildState([
          { name: 'title', type: 'string', status: 'UNCHANGED' },
          slug,
        ] as AnyAttribute[]),
        editName(uid, 'title', 'heading')
      );

      expect(getTargetField(state)).toBe('heading');
    });

    it('follows the rename when the migration is not recorded or is declined', () => {
      const edit = (consent: { recordRename?: boolean; declineRename?: boolean }) =>
        reducer(
          buildState([
            { name: 'title', type: 'string', status: 'UNCHANGED' },
            slug,
          ] as AnyAttribute[]),
          actions.editAttribute({
            attributeToSet: { type: 'string', name: 'heading' } as AnyAttribute,
            forTarget: 'contentType',
            targetUid: uid as Internal.UID.ContentType,
            name: 'title',
            ...consent,
          })
        );

      expect(getTargetField(edit({ recordRename: false }))).toBe('heading');
      expect(getTargetField(edit({ declineRename: true }))).toBe('heading');
    });

    it('follows the rename of a NEW field, which records no hop', () => {
      const state = reducer(
        buildState([{ name: 'title', type: 'string', status: 'NEW' }, slug] as AnyAttribute[]),
        editName(uid, 'title', 'heading')
      );

      expect(getRenames(state, uid)).toBeUndefined();
      expect(getTargetField(state)).toBe('heading');
    });

    it('resolves a multi-hop rename to the final name (title -> a -> heading)', () => {
      let state = reducer(
        buildState([
          { name: 'title', type: 'string', status: 'UNCHANGED' },
          slug,
        ] as AnyAttribute[]),
        editName(uid, 'title', 'a')
      );
      state = reducer(state, editName(uid, 'a', 'heading'));

      expect(getTargetField(state)).toBe('heading');
    });

    it('follows each field through a swap (title -> tmp, subtitle -> title, tmp -> subtitle)', () => {
      let state = reducer(
        buildState([
          { name: 'title', type: 'string', status: 'UNCHANGED' },
          { name: 'subtitle', type: 'string', status: 'UNCHANGED' },
          slug,
          { name: 'subSlug', type: 'uid', targetField: 'subtitle', status: 'UNCHANGED' },
        ] as AnyAttribute[]),
        editName(uid, 'title', 'tmp')
      );
      state = reducer(state, editName(uid, 'subtitle', 'title'));
      state = reducer(state, editName(uid, 'tmp', 'subtitle'));

      expect(getTargetField(state)).toBe('subtitle');
      expect(getTargetField(state, 'subSlug')).toBe('title');
    });

    it('stays attached when the renamed target changes from string to text', () => {
      const state = reducer(
        buildState([
          { name: 'title', type: 'string', status: 'UNCHANGED' },
          slug,
        ] as AnyAttribute[]),
        actions.editAttribute({
          attributeToSet: { type: 'text', name: 'heading' } as AnyAttribute,
          forTarget: 'contentType',
          targetUid: uid as Internal.UID.ContentType,
          name: 'title',
        })
      );

      expect(getTargetField(state)).toBe('heading');
    });

    it('detaches the uid when the renamed target is no longer a string or text', () => {
      const state = reducer(
        buildState([
          { name: 'title', type: 'string', status: 'UNCHANGED' },
          slug,
        ] as AnyAttribute[]),
        actions.editAttribute({
          attributeToSet: { type: 'integer', name: 'count' } as AnyAttribute,
          forTarget: 'contentType',
          targetUid: uid as Internal.UID.ContentType,
          name: 'title',
        })
      );

      expect(getTargetField(state)).toBeUndefined();
    });

    it('leaves uid fields attached to other fields alone', () => {
      const state = reducer(
        buildState([
          { name: 'title', type: 'string', status: 'UNCHANGED' },
          { name: 'subtitle', type: 'string', status: 'UNCHANGED' },
          slug,
        ] as AnyAttribute[]),
        editName(uid, 'subtitle', 'summary')
      );

      expect(getTargetField(state)).toBe('title');
    });

    it('follows the rename of a custom field', () => {
      const state = reducer(
        buildState([
          { name: 'title', type: 'string', customField: 'plugin::x.y', status: 'UNCHANGED' },
          slug,
        ] as AnyAttribute[]),
        actions.editCustomFieldAttribute({
          attributeToSet: {
            type: 'string',
            customField: 'plugin::x.y',
            name: 'heading',
          } as AnyAttribute,
          forTarget: 'contentType',
          targetUid: uid as Internal.UID.ContentType,
          name: 'title',
        })
      );

      expect(getTargetField(state)).toBe('heading');
    });
  });
});
