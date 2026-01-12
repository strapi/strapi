import * as React from 'react';

import { renderHook, waitFor } from '@testing-library/react';

import { CTBSessionProvider } from '../../CTBSession/ctbSession';
import {
  FormModalNavigationProvider,
  State,
  INITIAL_STATE_DATA,
} from '../FormModalNavigationProvider';
import { useFormModalNavigation } from '../useFormModalNavigation';

const removeFunctionsFromObject = (state: State) => {
  const stringified = JSON.stringify(state);
  const parsed = JSON.parse(stringified);

  return parsed;
};

describe('FromModalNavigationProvider', () => {
  it('sets the initial state', () => {
    const Wrapper = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(
        CTBSessionProvider,
        null,
        React.createElement(FormModalNavigationProvider, null, children)
      );

    const { result } = renderHook(() => useFormModalNavigation(), {
      wrapper: Wrapper,
    });

    const currentStateWithoutFunctions = removeFunctionsFromObject(result.current);

    expect(currentStateWithoutFunctions).toEqual(INITIAL_STATE_DATA);
  });

  it('updates the state when selecting a custom field for a new attribute', async () => {
    const Wrapper = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(
        CTBSessionProvider,
        null,
        React.createElement(FormModalNavigationProvider, null, children)
      );

    const { result } = renderHook(() => useFormModalNavigation(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      result.current.onClickSelectCustomField({
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

  it('updates the state when editing a custom field attribute', async () => {
    const Wrapper = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(
        CTBSessionProvider,
        null,
        React.createElement(FormModalNavigationProvider, null, children)
      );

    const { result } = renderHook(() => useFormModalNavigation(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      result.current.onOpenModalEditCustomField({
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
