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
      allTakenNames: [],
      cancelNewFeature: jest.fn(),
      connections: ['default'],
      createTempFeature: jest.fn(),
      isOpen: true,
      isUpdatingTemporaryFeature: false,
      featureToEditName: '',
      modifiedData: {
        collectionName: '',
        connection: '',
        description: '',
        mainField: '',
        name: '',
        attributes: {},
      },
      onChangeExistingFeatureMainInfos: jest.fn(),
      onChangeNewFeatureMainInfos: jest.fn(),
      onSubmit: jest.fn(),
      push: jest.fn(),
      resetExistingFeatureMainInfos: jest.fn(),
      resetNewFeatureMainInfos: jest.fn(),
      updateTempFeature: jest.fn(),
    };
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('should not crash', () => {
    wrapper = renderComponent(props);
  });

  it('should use the defaultProps', () => {
    delete props.cancelNewFeature;
    delete props.createTempFeature;
    delete props.onChangeExistingFeatureMainInfos;
    delete props.onSubmit;
    delete props.resetExistingFeatureMainInfos;
    delete props.resetNewFeatureMainInfos;
    delete props.updateTempFeature;

    wrapper = renderComponent(props);

    const {
      defaultProps: {
        cancelNewFeature,
        createTempFeature,
        onChangeExistingFeatureMainInfos,
        onSubmit,
        resetExistingFeatureMainInfos,
        resetNewFeatureMainInfos,
        updateTempFeature,
      },
    } = ModelForm;

    expect(cancelNewFeature).toBeDefined();
    expect(cancelNewFeature()).toBe(undefined);
    expect(createTempFeature).toBeDefined();
    expect(createTempFeature()).toBe(undefined);
    expect(onChangeExistingFeatureMainInfos).toBeDefined();
    expect(onChangeExistingFeatureMainInfos()).toBe(undefined);
    expect(onSubmit).toBeDefined();
    expect(onSubmit({ preventDefault: jest.fn() })).toBe(undefined);
    expect(resetExistingFeatureMainInfos).toBeDefined();
    expect(resetExistingFeatureMainInfos()).toBe(undefined);
    expect(resetNewFeatureMainInfos).toBeDefined();
    expect(resetNewFeatureMainInfos()).toBe(undefined);
    expect(updateTempFeature).toBeDefined();
    expect(updateTempFeature()).toBe(undefined);
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
    props.isUpdatingTemporaryFeature = true;

    wrapper = renderComponent(props);
    wrapper.setState({ isVisible: true });

    const input = wrapper.find(Input).at(0);
    const { name } = input.props();

    expect(name).toBe('name');

    input.simulate('change');

    expect(props.onChangeNewFeatureMainInfos).toHaveBeenCalled();
  });

  it('should handle the edition of a saved CT correctly for the inputs settings', () => {
    props.actionType = 'edit';
    props.isUpdatingTemporaryFeature = false;
    props.featureToEditName = 'test';

    wrapper = renderComponent(props);
    wrapper.setState({ isVisible: true });

    const input = wrapper.find(Input).at(0);
    const { name } = input.props();

    expect(name).toBe('test.name');

    input.simulate('change');

    expect(props.onChangeExistingFeatureMainInfos).toHaveBeenCalled();
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
        props.featureToEditName = 'test';
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
          'didSelectContentTypeSettings'
        );
        expect(props.push).toHaveBeenCalledWith({
          search: 'modalType=model&settingType=advanced&actionType=create',
        });
      });
    });

    describe('HandleCancel', () => {
      it('should call only the cancelNewFeature if the actionType is create', () => {
        wrapper = renderComponent(props);

        const { handleCancel } = wrapper.instance();

        handleCancel();

        expect(props.cancelNewFeature).toHaveBeenCalled();
        expect(props.resetNewFeatureMainInfos).not.toHaveBeenCalled();
        expect(props.resetExistingFeatureMainInfos).not.toHaveBeenCalled();
        expect(props.push).toHaveBeenCalledWith({ search: '' });
      });

      it('should call only the resetNewFeatureMainInfos if the actionType is edit and if the user is editing a temporary ct', () => {
        props.actionType = 'edit';
        props.isUpdatingTemporaryFeature = true;
        wrapper = renderComponent(props);

        const { handleCancel } = wrapper.instance();

        handleCancel();

        expect(props.cancelNewFeature).not.toHaveBeenCalled();
        expect(props.resetNewFeatureMainInfos).toHaveBeenCalled();
        expect(props.resetExistingFeatureMainInfos).not.toHaveBeenCalled();
        expect(props.push).toHaveBeenCalledWith({ search: '' });
      });

      it('should call only the resetExistingFeatureMainInfos if the actionType is edit and if the user is not editing a temporary ct', () => {
        props.actionType = 'edit';
        props.isUpdatingTemporaryFeature = false;
        wrapper = renderComponent(props);

        const { handleCancel } = wrapper.instance();

        handleCancel();

        expect(props.cancelNewFeature).not.toHaveBeenCalled();
        expect(props.resetNewFeatureMainInfos).not.toHaveBeenCalled();
        expect(props.resetExistingFeatureMainInfos).toHaveBeenCalled();
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
        props.allTakenNames = ['test'];
        props.modifiedData.name = 'test';
        props.featureToEditName = '';
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
        expect(props.createTempFeature).toHaveBeenCalled();
        expect(props.updateTempFeature).not.toHaveBeenCalled();
      });

      it('should submit if the form is not empty and the user is editing a temporary CT', () => {
        props.modifiedData.name = 'test';
        props.allTakenNames = ['test'];
        props.actionType = 'edit';
        props.isUpdatingTemporaryFeature = true;
        props.featureToEditName = 'test';
        wrapper = renderComponent(props);

        const { handleSubmit } = wrapper.instance();

        handleSubmit({ preventDefault: jest.fn() });

        expect(wrapper.state('formErrors')).toEqual({});
        expect(props.push).toHaveBeenCalledWith({
          pathname: '/plugins/content-type-builder/models/test',
          search: '',
        });
        expect(props.createTempFeature).not.toHaveBeenCalled();
        expect(props.updateTempFeature).toHaveBeenCalled();
      });

      it('should submit if the form is not empty and the user is editing a saved CT', () => {
        props.modifiedData.name = 'test';
        props.actionType = 'edit';
        props.isUpdatingTemporaryFeature = false;
        props.allTakenNames = ['test'];
        props.featureToEditName = 'test';
        wrapper = renderComponent(props);

        const { handleSubmit } = wrapper.instance();

        handleSubmit({ preventDefault: jest.fn() });

        expect(wrapper.state('formErrors')).toEqual({});
        expect(props.push).toHaveBeenCalledWith({
          search: '',
        });
        expect(props.updateTempFeature).not.toHaveBeenCalled();
        expect(props.createTempFeature).not.toHaveBeenCalled();
      });
    });
  });
});
