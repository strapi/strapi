import { act, renderHook } from '@testing-library/react';

import { useFormModalNavigation } from '../../../hooks/useFormModalNavigation';
import { INITIAL_STATE_DATA } from '../constants';
import { FormModalNavigationProvider, State } from '../FormModalNavigationProvider';

const removeFunctionsFromObject = (state: State) => {
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

  it('updates the state when selecting a custom field for a new attribute', () => {
    const { result } = renderHook(() => useFormModalNavigation(), {
      wrapper: FormModalNavigationProvider,
    });

    act(() => {
      (result.current as any).onClickSelectCustomField({
        attributeType: 'text',
        customFieldUid: 'plugin::mycustomfields.color',
      });
    });

    const currentStateWithoutFunctions = removeFunctionsFromObject(result.current);
    const expected = {
      ...INITIAL_STATE_DATA,
      actionType: 'create',
      modalType: 'customField',
      attributeType: 'text',
      customFieldUid: 'plugin::mycustomfields.color',
    };

    expect(currentStateWithoutFunctions).toEqual(expected);
  });

  it('updates the state when editing a custom field attribute', () => {
    const { result } = renderHook(() => useFormModalNavigation(), {
      wrapper: FormModalNavigationProvider,
    });

    act(() => {
      (result.current as any).onOpenModalEditCustomField({
        forTarget: 'contentType',
        targetUid: 'api::test.test',
        attributeName: 'color',
        attributeType: 'text',
        customFieldUid: 'plugin::mycustomfields.color',
      });
    });

    const currentStateWithoutFunctions = removeFunctionsFromObject(result.current);
    const expected = {
      ...INITIAL_STATE_DATA,
      isOpen: true,
      modalType: 'customField',
      actionType: 'edit',
      forTarget: 'contentType',
      targetUid: 'api::test.test',
      attributeName: 'color',
      attributeType: 'text',
      customFieldUid: 'plugin::mycustomfields.color',
    };

    expect(currentStateWithoutFunctions).toEqual(expected);
  });
});
