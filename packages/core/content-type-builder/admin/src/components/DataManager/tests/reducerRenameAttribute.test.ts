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
});
