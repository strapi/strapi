import { reducer, actions } from '../reducer';

import { initCT, init } from './utils';

const editName = (uid: string, name: string, newName: string, extra: Record<string, any> = {}) =>
  actions.editAttribute({
    attributeToSet: { type: 'string', name: newName, ...extra } as any,
    forTarget: 'contentType',
    targetUid: uid,
    name,
  });

const getRenames = (state: any, uid: string) => state.current.contentTypes[uid].renames;

const getAttr = (state: any, uid: string, name: string) =>
  state.current.contentTypes[uid].attributes.find((attr: any) => attr.name === name);

describe('CTB | DataManager | reducer | rename tracking (EDIT_ATTRIBUTE)', () => {
  const uid = 'api::article.article';

  const buildState = (attributes: any[]) =>
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

  it('does not record a rename when editing other props without a name change', () => {
    const state = reducer(
      buildState([{ name: 'title', type: 'string', status: 'UNCHANGED' }]),
      editName(uid, 'title', 'title', { required: true })
    );

    expect(getRenames(state, uid)).toBeUndefined();
  });
});
