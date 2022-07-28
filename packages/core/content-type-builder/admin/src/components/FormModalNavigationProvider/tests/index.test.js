import { renderHook, act } from '@testing-library/react-hooks';
import { INITIAL_STATE_DATA } from '../constants';
import FormModalNavigationProvider from '../index';
import useFormModalNavigation from '../../../hooks/useFormModalNavigation';

const removeFunctionsFromObject = state => {
  const stringified = JSON.stringify(state);
  const parsed = JSON.parse(stringified);

  return parsed;
};

describe('FromModalNavigationProvider', () => {
  it('sets the initial state', () => {
    const { result } = renderHook(() => useFormModalNavigation(), {
      wrapper: FormModalNavigationProvider,
    });

    const currentStateWithoutFunctions = removeFunctionsFromObject(result.current);

    expect(currentStateWithoutFunctions).toEqual(INITIAL_STATE_DATA);
  });

  it('updates the form navigation state when selecting a custom field', () => {
    const { result } = renderHook(() => useFormModalNavigation(), {
      wrapper: FormModalNavigationProvider,
    });

    act(() => {
      result.current.onClickSelectCustomField({
        attributeType: 'text',
        customFieldUid: 'plugin::mycustomfields.color',
      });
    });

    const currentStateWithoutFunctions = removeFunctionsFromObject(result.current);
    const expected = {
      ...INITIAL_STATE_DATA,
      actionType: 'create',
      modalType: 'attribute',
      attributeType: 'text',
      customFieldUid: 'plugin::mycustomfields.color',
    };

    expect(currentStateWithoutFunctions).toEqual(expected);
  });
});
