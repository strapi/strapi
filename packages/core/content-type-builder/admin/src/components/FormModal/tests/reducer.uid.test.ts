import { actions, initialState, reducer, type State } from '../reducer';

describe('CTB | FormModal | UID changes', () => {
  it('removes a UID default when a target field is selected', () => {
    const state: State = {
      ...initialState,
      modifiedData: {
        type: 'uid',
        name: 'slug',
        default: 'fallback-slug',
      },
    };

    const nextState = reducer(
      state,
      actions.onChange({
        keys: ['targetField'],
        value: 'title',
      })
    );

    expect(nextState.modifiedData).toEqual({
      type: 'uid',
      name: 'slug',
      targetField: 'title',
    });
  });

  it('keeps a UID default when the target field is cleared', () => {
    const state: State = {
      ...initialState,
      modifiedData: {
        type: 'uid',
        name: 'slug',
        default: 'fallback-slug',
        targetField: 'title',
      },
    };

    const nextState = reducer(
      state,
      actions.onChange({
        keys: ['targetField'],
        value: '',
      })
    );

    expect(nextState.modifiedData).toEqual({
      type: 'uid',
      name: 'slug',
      default: 'fallback-slug',
      targetField: '',
    });
  });
});
