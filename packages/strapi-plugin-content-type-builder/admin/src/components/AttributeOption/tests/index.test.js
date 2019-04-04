import React from 'react';

import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import AttributeOption from '../index';

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);

const renderComponent = (props = {}) => mountWithIntl(<AttributeOption {...props} />, messages);

describe('<AttributeOption />', () => {
  it('should not crash', () => {
    renderComponent();
  });

  it('should call the focusNode instance if the component isDisplayed and the nodeToFocus is equal to its tabIndex', () => {
    const props = {
      isDisplayed: false,
      nodeToFocus: 0,
      tabIndex: 0,
      type: 'string',
    };
    const wrapper = renderComponent(props);
    const spyOnFocusNode = jest.spyOn(wrapper.instance(), 'focusNode');
    const spyOnFocusAction = jest.spyOn(wrapper.instance().button.current, 'focus');

    wrapper.instance().forceUpdate();

    wrapper.setProps({ isDisplayed: true });

    expect(spyOnFocusNode).toHaveBeenCalled();
    expect(spyOnFocusAction).toHaveBeenCalled();
  });

  it('should call the focusNode instance if the component nodeToFocus prop is equal to its tabIndex on update', () => {
    const props = {
      isDisplayed: true,
      nodeToFocus: 0,
      tabIndex: 1,
      type: 'string',
    };
    const wrapper = renderComponent(props);
    const spyOnFocusNode = jest.spyOn(wrapper.instance(), 'focusNode');
    const spyOnFocusAction = jest.spyOn(wrapper.instance().button.current, 'focus');

    wrapper.instance().forceUpdate();

    wrapper.setProps({ nodeToFocus: 1 });

    expect(spyOnFocusNode).toHaveBeenCalled();
    expect(spyOnFocusAction).toHaveBeenCalled();
  });

  it('should call the onClick prop with its type as argument', () => {
    const props = {
      onClick: jest.fn(),
      type: 'string',
    };
    const wrapper = renderComponent(props);
    wrapper.find('button').simulate('click');

    expect(props.onClick).toHaveBeenLastCalledWith('string');
  });

  it('should use the defaultProps', () => {
    const { defaultProps } = AttributeOption;

    expect(defaultProps.onBlur).toBeFalsy();

    expect(defaultProps.onClick).toBeDefined();
    expect(defaultProps.onClick()).toEqual(undefined);
  });
});
