import React from 'react';
import { fromJS } from 'immutable';

import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import AttributesPickerModal from '../index';

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);

const renderComponent = (
  props = {},
  context = {
    emitEvent: jest.fn(),
    plugins: {
      'content-type-builder': {},
    },
  },
) => mountWithIntl(<AttributesPickerModal {...props} />, messages, context);

describe('<AttributesPickerModal />', () => {
  let props;

  beforeEach(() => {
    props = {
      isOpen: false,
      push: jest.fn(),
    };
  });

  it('it should not crash', () => {
    const wrapper = renderComponent(props);

    wrapper.unmount();
  });

  it('should add the keyup eventListener when mounted if the isOpen prop is true', () => {
    props.isOpen = true;

    const wrapper = renderComponent(props);
    const spyOnAddEventListener = jest.spyOn(wrapper.instance(), 'addEventListener');

    wrapper.instance().componentDidMount();

    expect(spyOnAddEventListener).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('should update the nodeToFocus state when the isOpen prop changes', () => {
    const wrapper = renderComponent(props);
    const spyOnUpdateNodeToFocus = jest.spyOn(wrapper.instance(), 'updateNodeToFocus');
    const spyOnAddEventListener = jest.spyOn(wrapper.instance(), 'addEventListener');

    wrapper.setState({ nodeToFocus: 1 });
    wrapper.setProps({ isOpen: true });

    expect(spyOnUpdateNodeToFocus).toHaveBeenCalledWith(0);
    expect(spyOnAddEventListener).toHaveBeenCalled();
    expect(wrapper.state('nodeToFocus')).toEqual(0);

    wrapper.unmount();
  });

  it('should remove the event listener when the props isOpen changes from true to false', () => {
    props.isOpen = true;

    const wrapper = renderComponent(props);
    const removeEventListener = jest.spyOn(wrapper.instance(), 'removeEventListener');

    wrapper.setProps({ isOpen: false });

    expect(removeEventListener).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('should remove the media option if the upload plugin is not installed', () => {
    const context = {
      emitEvent: jest.fn(),
      plugins: {
        'content-type-builder': {},
      },
    };
    const wrapper = renderComponent(props, context);
    const { getAttributes } = wrapper.instance();

    expect(getAttributes()).not.toContain({
      type: 'media',
      description: 'content-type-builder.popUpForm.attributes.media.description',
    });
  });

  it('should not remove the media option if the upload plugin is installed', () => {
    const context = {
      emitEvent: jest.fn(),
      plugins: {
        'content-type-builder': {},
        upload: {},
      },
    };
    const wrapper = renderComponent(props, context);
    const { getAttributes } = wrapper.instance();

    expect(getAttributes()).toContainEqual({
      type: 'media',
      description: 'content-type-builder.popUpForm.attributes.media.description',
    });

    wrapper.unmount();
  });

  it('should handle the plugins context object correctly', () => {
    const context = {
      emitEvent: jest.fn(),
      plugins: fromJS({
        'content-type-builder': {},
        upload: {},
      }),
    };
    const wrapper = renderComponent(props, context);
    const { getAttributes } = wrapper.instance();

    expect(getAttributes()).not.toBeNull();
  });

  it('should handle the onOpened instance correctly', () => {
    const wrapper = renderComponent(props);

    wrapper.instance().handleOnOpened();
    expect(wrapper.state('isDisplayed')).toEqual(true);

    wrapper.unmount();
  });

  it('should handle the onClosed instance correctly', () => {
    const wrapper = renderComponent(props);

    wrapper.setState({ isDisplayed: true });
    wrapper.instance().handleOnClosed();

    expect(wrapper.state('isDisplayed')).toEqual(false);

    wrapper.unmount();
  });

  it('should handle the toggle instance correctly', () => {
    const wrapper = renderComponent(props);

    wrapper.instance().handleToggle();

    expect(props.push).toHaveBeenCalledWith({ search: '' });

    wrapper.unmount();
  });

  it('listens to the keydown event', () => {
    const map = {};
    document.addEventListener = jest.fn((event, cb) => {
      map[event] = cb;
    });
    const context = {
      emitEvent: jest.fn(),
      plugins: fromJS({
        'content-type-builder': {},
        upload: {},
      }),
    };
    const wrapper = renderComponent(props, context);
    const spyOnHandleKeyDown = jest.spyOn(wrapper.instance(), 'handleKeyDown');

    wrapper.instance().forceUpdate();
    wrapper.setProps({ isOpen: true });
    map.keydown({ key: 'Tab' });

    expect(spyOnHandleKeyDown).toHaveBeenCalled();
  });

  describe('instances', () => {
    describe('handleClick', () => {
      it('should handle the click correctly', () => {
        const wrapper = renderComponent(props);
        const { handleClick } = wrapper.instance();

        handleClick('test');

        expect(props.push).toHaveBeenCalledWith({
          search: 'modalType=attributeForm&attributeType=test&settingType=base&actionType=create',
        });
      });
    });
  });
});
