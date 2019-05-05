import React from 'react';

import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import { InputsIndex as Input } from 'strapi-helper-plugin';

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import ModelForm from '../index';

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);
const context = { emitEvent: jest.fn() };
const renderComponent = (props = {}) =>
  mountWithIntl(<ModelForm {...props} />, messages, context);

describe('<ModelForm />', () => {
  let props;
  let wrapper;

  beforeEach(() => {
    props = {
      actionType: 'create',
      activeTab: 'base',
      cancelNewContentType: jest.fn(),
      connections: ['default'],
      createTempContentType: jest.fn(),
      currentData: {},
      isOpen: true,
      isUpdatingTemporaryContentType: false,
      modelToEditName: '',
      modifiedData: {
        collectionName: '',
        connection: '',
        description: '',
        mainField: '',
        name: '',
        attributes: {},
      },
      onChangeExistingContentTypeMainInfos: jest.fn(),
      onChangeNewContentTypeMainInfos: jest.fn(),
      onSubmit: jest.fn(),
      push: jest.fn(),
      resetExistingContentTypeMainInfos: jest.fn(),
      resetNewContentTypeMainInfos: jest.fn(),
      updateTempContentType: jest.fn(),
    };
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('should not crash', () => {
    wrapper = renderComponent(props);
  });

  it('should use the defaultProps', () => {
    delete props.cancelNewContentType;
    delete props.createTempContentType;
    delete props.onChangeExistingContentTypeMainInfos;
    delete props.onSubmit;
    delete props.resetExistingContentTypeMainInfos;
    delete props.resetNewContentTypeMainInfos;
    delete props.resetNewContentTypeMainInfos;
    delete props.resetNewContentTypeMainInfos;
    delete props.updateTempContentType;

    wrapper = renderComponent(props);

    const {
      defaultProps: {
        cancelNewContentType,
        createTempContentType,
        onChangeExistingContentTypeMainInfos,
        onSubmit,
        resetExistingContentTypeMainInfos,
        resetNewContentTypeMainInfos,
        updateTempContentType,
      },
    } = ModelForm;

    expect(cancelNewContentType).toBeDefined();
    expect(cancelNewContentType()).toBe(undefined);
    expect(createTempContentType).toBeDefined();
    expect(createTempContentType()).toBe(undefined);
    expect(onChangeExistingContentTypeMainInfos).toBeDefined();
    expect(onChangeExistingContentTypeMainInfos()).toBe(undefined);
    expect(onSubmit).toBeDefined();
    expect(onSubmit({ preventDefault: jest.fn() })).toBe(undefined);
    expect(resetExistingContentTypeMainInfos).toBeDefined();
    expect(resetExistingContentTypeMainInfos()).toBe(undefined);
    expect(resetNewContentTypeMainInfos).toBeDefined();
    expect(resetNewContentTypeMainInfos()).toBe(undefined);
    expect(updateTempContentType).toBeDefined();
    expect(updateTempContentType()).toBe(undefined);
  });

  it('should not show the inputs until the modal is fully opened', () => {
    wrapper = renderComponent(props);

    const inputs = wrapper.find(Input);

    expect(inputs).toHaveLength(0);
  });

  it('should show the inputs if the modal is fully opened', () => {
    wrapper = renderComponent(props);
    wrapper.setState({ isVisible: true });

    const inputs = wrapper.find(Input);

    expect(inputs).toHaveLength(3);
  });

  it('should handle the edition of a temporary CT correctly for the inputs settings', () => {
    props.actionType = 'edit';
    props.isUpdatingTemporaryContentType = true;

    wrapper = renderComponent(props);
    wrapper.setState({ isVisible: true });

    const input = wrapper.find(Input).at(0);
    const { name } = input.props();

    expect(name).toBe('name');

    input.simulate('change');

    expect(props.onChangeNewContentTypeMainInfos).toHaveBeenCalled();
  });

  it('should handle the edition of a saved CT correctly for the inputs settings', () => {
    props.actionType = 'edit';
    props.isUpdatingTemporaryContentType = false;
    props.modelToEditName = 'test';

    wrapper = renderComponent(props);
    wrapper.setState({ isVisible: true });

    const input = wrapper.find(Input).at(0);
    const { name } = input.props();

    expect(name).toBe('test.name');

    input.simulate('change');

    expect(props.onChangeExistingContentTypeMainInfos).toHaveBeenCalled();
  });

  describe('Instances', () => {
    describe('HandleOnOpened', () => {
      it('should set the isVisible state to true', () => {
        wrapper = renderComponent(props);

        const { handleOnOpened } = wrapper.instance();

        handleOnOpened();

        expect(wrapper.state('isVisible')).toBeTruthy();
      });
    });

    describe('HandleOnClosed', () => {
      it('should set the isVisible state to true', () => {
        wrapper = renderComponent(props);
        wrapper.setState({ isVisible: true });

        const { handleOnClosed } = wrapper.instance();

        handleOnClosed();

        expect(wrapper.state('isVisible')).toBeFalsy();
      });
    });

    describe('HandleGoTo', () => {
      it('should add the modelName when navvigating if the user is editing a model', () => {
        props.actionType = 'edit';
        props.modelToEditName = 'test';
        wrapper = renderComponent(props);

        const { handleGoTo } = wrapper.instance();

        handleGoTo('base');

        expect(context.emitEvent).not.toHaveBeenCalled();
        expect(props.push).toHaveBeenCalledWith({
          search:
            'modalType=model&settingType=base&actionType=edit&modelName=test',
        });
      });

      it('should emit an event if the tab is advanced', () => {
        props.actionType = 'create';
        wrapper = renderComponent(props);

        const { handleGoTo } = wrapper.instance();

        handleGoTo('advanced');

        expect(context.emitEvent).toHaveBeenCalledWith(
          'didSelectContentTypeSettings',
        );
        expect(props.push).toHaveBeenCalledWith({
          search: 'modalType=model&settingType=advanced&actionType=create',
        });
      });
    });

    describe('HandleCancel', () => {
      it('should call only the cancelNewContentType if the actionType is create', () => {
        wrapper = renderComponent(props);

        const { handleCancel } = wrapper.instance();

        handleCancel();

        expect(props.cancelNewContentType).toHaveBeenCalled();
        expect(props.resetNewContentTypeMainInfos).not.toHaveBeenCalled();
        expect(props.resetExistingContentTypeMainInfos).not.toHaveBeenCalled();
        expect(props.push).toHaveBeenCalledWith({ search: '' });
      });

      it('should call only the resetNewContentTypeMainInfos if the actionType is edit and if the user is editing a temporary ct', () => {
        props.actionType = 'edit';
        props.isUpdatingTemporaryContentType = true;
        wrapper = renderComponent(props);

        const { handleCancel } = wrapper.instance();

        handleCancel();

        expect(props.cancelNewContentType).not.toHaveBeenCalled();
        expect(props.resetNewContentTypeMainInfos).toHaveBeenCalled();
        expect(props.resetExistingContentTypeMainInfos).not.toHaveBeenCalled();
        expect(props.push).toHaveBeenCalledWith({ search: '' });
      });

      it('should call only the resetExistingContentTypeMainInfos if the actionType is edit and if the user is not editing a temporary ct', () => {
        props.actionType = 'edit';
        props.isUpdatingTemporaryContentType = false;
        wrapper = renderComponent(props);

        const { handleCancel } = wrapper.instance();

        handleCancel();

        expect(props.cancelNewContentType).not.toHaveBeenCalled();
        expect(props.resetNewContentTypeMainInfos).not.toHaveBeenCalled();
        expect(props.resetExistingContentTypeMainInfos).toHaveBeenCalled();
        expect(props.push).toHaveBeenCalledWith({ search: '' });
      });
    });

    describe('HandleSubmit', () => {
      it('should not submit if the form is empty', () => {
        wrapper = renderComponent(props);

        const { handleSubmit } = wrapper.instance();

        handleSubmit({ preventDefault: jest.fn() });

        expect(wrapper.state('formErrors')).toEqual({
          name: [{ id: `${pluginId}.error.validation.required` }],
        });
        expect(wrapper.prop('push')).not.toHaveBeenCalled();
      });

      it('should not submit if the name of the CT is already taken', () => {
        props.currentData = { test: {} };
        props.modifiedData.name = 'test';
        props.modelToEditName = '';
        props.actionType = 'create';
        wrapper = renderComponent(props);

        const { handleSubmit } = wrapper.instance();

        handleSubmit({ preventDefault: jest.fn() });

        expect(wrapper.state('formErrors')).toEqual({
          name: [{ id: `${pluginId}.error.contentTypeName.taken` }],
        });
        expect(wrapper.prop('push')).not.toHaveBeenCalled();
      });

      it('should submit if the form is not empty and the user is creating a CT', () => {
        props.modifiedData.name = 'test';
        wrapper = renderComponent(props);

        const { handleSubmit } = wrapper.instance();

        handleSubmit({ preventDefault: jest.fn() });

        expect(wrapper.state('formErrors')).toEqual({});
        expect(props.push).toHaveBeenCalledWith({
          pathname: `/plugins/${pluginId}/models/test`,
          search: 'modalType=chooseAttributes',
        });
        expect(props.createTempContentType).toHaveBeenCalled();
        expect(props.updateTempContentType).not.toHaveBeenCalled();
      });

      it('should submit if the form is not empty and the user is editing a temporary CT', () => {
        props.modifiedData.name = 'test';
        props.actionType = 'edit';
        props.isUpdatingTemporaryContentType = true;
        props.currentData = { test: {} };
        props.modelToEditName = 'test';
        wrapper = renderComponent(props);

        const { handleSubmit } = wrapper.instance();

        handleSubmit({ preventDefault: jest.fn() });

        expect(wrapper.state('formErrors')).toEqual({});
        expect(props.push).toHaveBeenCalledWith({
          pathname: '/plugins/content-type-builder/models/test',
          search: '',
        });
        expect(props.createTempContentType).not.toHaveBeenCalled();
        expect(props.updateTempContentType).toHaveBeenCalled();
      });

      it('should submit if the form is not empty and the user is editing a saved CT', () => {
        props.modifiedData.name = 'test';
        props.actionType = 'edit';
        props.isUpdatingTemporaryContentType = false;
        props.currentData = { test: {} };
        props.modelToEditName = 'test';
        wrapper = renderComponent(props);

        const { handleSubmit } = wrapper.instance();

        handleSubmit({ preventDefault: jest.fn() });

        expect(wrapper.state('formErrors')).toEqual({});
        expect(props.push).toHaveBeenCalledWith({
          search: '',
        });
        expect(props.updateTempContentType).not.toHaveBeenCalled();
        expect(props.createTempContentType).not.toHaveBeenCalled();
      });
    });
  });
});
