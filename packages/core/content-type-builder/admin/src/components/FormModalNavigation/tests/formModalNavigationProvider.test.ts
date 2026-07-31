import * as React from 'react';

import { act, renderHook } from '@testing-library/react';

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
    // Asserted against explicit literals rather than the imported INITIAL_STATE_DATA constant:
    // the lint cleanup flipped these defaults from `null` to concrete values, and comparing the
    // state to the same constant it is built from could never catch a regression in those defaults.
    expect(currentStateWithoutFunctions).toEqual({
      actionType: 'create',
      attributeName: '',
      attributeType: '',
      dynamicZoneTarget: '',
      forTarget: 'contentType',
      modalType: null,
      isOpen: true,
      showBackLink: false,
      kind: 'collectionType',
      step: null,
      targetUid: '',
      customFieldUid: '',
      activeTab: 'basic',
    });
  });

  it('updates the state when selecting a custom field for a new attribute', () => {
    const Wrapper = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(
        CTBSessionProvider,
        null,
        React.createElement(FormModalNavigationProvider, null, children)
      );

    const { result } = renderHook(() => useFormModalNavigation(), {
      wrapper: Wrapper,
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
      modalType: 'customField',
      attributeType: 'text',
      customFieldUid: 'plugin::mycustomfields.color',
    };

    expect(currentStateWithoutFunctions).toEqual(expected);
  });

  it('updates the state when editing a custom field attribute', () => {
    const Wrapper = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(
        CTBSessionProvider,
        null,
        React.createElement(FormModalNavigationProvider, null, children)
      );

    const { result } = renderHook(() => useFormModalNavigation(), {
      wrapper: Wrapper,
    });

    act(() => {
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
