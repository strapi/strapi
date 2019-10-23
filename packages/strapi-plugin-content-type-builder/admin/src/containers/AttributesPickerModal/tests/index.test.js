import React from 'react';

import { GlobalContextProvider } from 'strapi-helper-plugin';
import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import AttributesPickerModal from '../index';

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);
const appContext = {
  emitEvent: jest.fn(),
  currentEnvironment: 'development',
  disableGlobalOverlayBlocker: jest.fn(),
  enableGlobalOverlayBlocker: jest.fn(),
  plugins: {},
  updatePlugin: jest.fn(),
};
const renderComponent = (props = {}) =>
  mountWithIntl(
    <GlobalContextProvider {...appContext}>
      <AttributesPickerModal {...props} />
    </GlobalContextProvider>,
    messages
  );

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

  it('should remove the media option if the upload plugin is not installed', () => {
    const wrapper = renderComponent(props);
    const compo = wrapper.find(AttributesPickerModal);
    const { getAttributes } = compo.instance();

    expect(getAttributes()).not.toContain({
      type: 'media',
      description:
        'content-type-builder.popUpForm.attributes.media.description',
    });
  });

  it('should handle the plugins context object correctly', () => {
    const wrapper = renderComponent(props);
    const compo = wrapper.find(AttributesPickerModal);
    const { getAttributes } = compo.instance();

    expect(getAttributes()).not.toBeNull();
  });

  it('should handle the onOpened instance correctly', () => {
    const wrapper = renderComponent(props);
    const compo = wrapper.find(AttributesPickerModal);
    compo.instance().handleOnOpened();
    expect(compo.state('isDisplayed')).toEqual(true);

    wrapper.unmount();
  });

  it('should handle the onClosed instance correctly', () => {
    const wrapper = renderComponent(props);

    const compo = wrapper.find(AttributesPickerModal);
    compo.setState({ isDisplayed: true });
    compo.instance().handleOnClosed();

    expect(compo.state('isDisplayed')).toEqual(false);

    wrapper.unmount();
  });

  it('should handle the toggle instance correctly', () => {
    const wrapper = renderComponent(props);

    wrapper
      .find(AttributesPickerModal)
      .instance()
      .handleToggle();

    expect(props.push).toHaveBeenCalledWith({ search: '' });

    wrapper.unmount();
  });

  describe('instances', () => {
    describe('handleClick', () => {
      it('should handle the click correctly', () => {
        const wrapper = renderComponent(props);
        const { handleClick } = wrapper.find(AttributesPickerModal).instance();

        handleClick('test');

        expect(props.push).toHaveBeenCalledWith({
          search:
            'modalType=attributeForm&attributeType=test&settingType=base&actionType=create',
        });
      });
    });
  });
});
