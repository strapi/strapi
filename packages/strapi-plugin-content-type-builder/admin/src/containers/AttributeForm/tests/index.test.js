import React from 'react';

import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import {
  GlobalContextProvider,
  InputsIndex as Input,
} from 'strapi-helper-plugin';
// This part is needed if you need to test the lifecycle of a container that contains FormattedMessages

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import CustomCheckbox from '../../../components/CustomCheckbox';
import HeaderModalTitle from '../../../components/HeaderModalTitle';
import AttributeForm from '../index';

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
      <AttributeForm {...props} />
    </GlobalContextProvider>,
    messages
  );

describe('<AttributeForm />', () => {
  let props;
  let wrapper;

  beforeEach(() => {
    props = {
      actionType: 'create',
      activeTab: 'base',
      attributeToEditName: '',
      alreadyTakenAttributes: [],
      attributeType: 'string',
      isOpen: false,
      modifiedData: {},
      onSubmit: jest.fn(),
      onSubmitEdit: jest.fn(),
      push: jest.fn(),
    };
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('should not crash', () => {
    wrapper = renderComponent(props);
  });

  it('should handle the custom inputs correctly', () => {
    props.activeTab = 'advanced';
    props.isOpen = true;

    wrapper = renderComponent(props);
    const compo = wrapper.find(AttributeForm);
    compo.setState({ showForm: true });

    const customs = wrapper.find(CustomCheckbox);
    const inputs = wrapper.find(Input);

    expect(customs).toHaveLength(2);
    expect(inputs).toHaveLength(3);
  });

  it('should handle the title correctly with the activeTab', () => {
    props.actionType = null;
    props.isOpen = true;
    props.attributeToEditName = 'test';

    wrapper = renderComponent(props);

    wrapper.setProps({ actionType: 'edit' });

    const title = wrapper
      .find(HeaderModalTitle)
      .last()
      .find('span')
      .last();

    expect(title.text()).toContain('test');
  });

  it('should use the defaultProps', () => {
    delete props.push;
    wrapper = renderComponent(props);

    const {
      defaultProps: { onCancel, onChange, push },
    } = AttributeForm;

    expect(onCancel).toBeDefined();
    expect(onCancel()).toBe(undefined);
    expect(onChange).toBeDefined();
    expect(onChange()).toBe(undefined);
    expect(push).toBeDefined();
    expect(push()).toBe(undefined);
  });

  describe('instances', () => {
    describe('GetFormErrors', () => {
      it("should return an empty object if there is not field that contain the created field's name", () => {
        props.modifiedData = { name: 'test' };

        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { getFormErrors } = compo.instance();

        expect(getFormErrors()).toEqual({});
      });

      it("should return an object with the input's name and an array of error if the name is empty", () => {
        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { getFormErrors } = compo.instance();

        expect(getFormErrors()).toEqual({
          name: [{ id: `${pluginId}.error.validation.required` }],
        });
      });

      it('should return a unique error if the name begins with a special character', () => {
        props.modifiedData = { name: '_test' };

        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { getFormErrors } = compo.instance();

        expect(getFormErrors()).toEqual({
          name: [{ id: `${pluginId}.error.validation.regex.name` }],
        });
      });

      it('should return a unique error if the name of the field is already taken', () => {
        props.alreadyTakenAttributes = ['test'];
        props.modifiedData = { name: 'test' };

        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { getFormErrors } = compo.instance();

        expect(getFormErrors()).toEqual({
          name: [{ id: `${pluginId}.error.attribute.taken` }],
        });
      });

      it('should not return a unique error if the use is editing a field', () => {
        props.alreadyTakenAttributes = ['test'];
        props.attributeToEditName = 'test';
        props.activeTab = 'advanced';
        props.modifiedData = { name: 'test', minLength: '' };

        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { getFormErrors } = compo.instance();

        expect(getFormErrors()).toEqual({
          minLength: [{ id: `${pluginId}.error.validation.required` }],
        });
      });

      it('should not return a unique error if the use is editing a field', () => {
        props.alreadyTakenAttributes = ['test'];
        props.attributeToEditName = 'test';
        props.modifiedData = { name: 'test' };

        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { getFormErrors } = compo.instance();

        expect(getFormErrors()).toEqual({});
      });
    });

    describe('HandleCancel', () => {
      it('should remove the search in the URL', () => {
        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { handleCancel } = compo.instance();

        handleCancel();

        expect(props.push).toHaveBeenCalledWith({ search: '' });
      });
    });

    describe('HandleGoTo', () => {
      it('should add the attributeName search parameter if the user is editing a field', () => {
        props.actionType = 'edit';
        props.attributeToEditName = 'name';
        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { handleGoTo } = compo.instance();

        handleGoTo('base');

        expect(props.push).toHaveBeenCalledWith({
          search:
            'modalType=attributeForm&attributeType=string&settingType=base&actionType=edit&attributeName=name',
        });
        expect(appContext.emitEvent).not.toHaveBeenCalled();
      });

      it('should emit the event didSelectContentTypeFieldSettings if the user clicks on advanced seettings', () => {
        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { handleGoTo } = compo.instance();

        handleGoTo('advanced');

        expect(props.push).toHaveBeenCalledWith({
          search:
            'modalType=attributeForm&attributeType=string&settingType=advanced&actionType=create',
        });
        expect(appContext.emitEvent).toHaveBeenCalledWith(
          'didSelectContentTypeFieldSettings'
        );
      });
    });

    describe('HandleOnClosed', () => {
      it('should set the showForm state to false', () => {
        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        compo.setState({ formErrors: {}, showForm: true });
        const { handleOnClosed } = compo.instance();

        handleOnClosed();

        expect(compo.state('showForm')).toBeFalsy();
      });
    });

    describe('HandleOnOpened', () => {
      it('should set the showForm state to false', () => {
        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        compo.setState({ showForm: false });
        const { handleOnOpened } = compo.instance();

        handleOnOpened();

        expect(compo.state('showForm')).toBeTruthy();
      });
    });

    describe('HandleSubmit', () => {
      it('should call the onSubmit prop if there is no error in the form', () => {
        props.modifiedData = { type: 'string', name: 'test' };

        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { handleSubmit } = compo.instance();

        handleSubmit();

        expect(props.onSubmit).toHaveBeenCalled();
      });

      it('should call the onSubmitEdit prop if there is no error in the form', () => {
        props.modifiedData = { type: 'string', name: 'test' };
        props.actionType = 'edit';

        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { handleSubmit } = compo.instance();

        handleSubmit();

        expect(props.onSubmitEdit).toHaveBeenCalled();
      });

      it('should not submit if thee form has an error', () => {
        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { handleSubmit } = compo.instance();

        handleSubmit();

        expect(props.onSubmitEdit).not.toHaveBeenCalled();
        expect(props.onSubmit).not.toHaveBeenCalled();
      });
    });

    describe('HandleSubmitAndContinue', () => {
      it('should call the onSubmit prop if there is no error in the form', () => {
        props.modifiedData = { type: 'string', name: 'test' };

        wrapper = renderComponent(props);
        const compo = wrapper.find(AttributeForm);
        const { handleSubmitAndContinue } = compo.instance();

        handleSubmitAndContinue({ preventDefault: jest.fn() });

        expect(props.onSubmit).toHaveBeenCalledWith(true);
      });

      it('should call the onSubmitEdit prop if there is no error in the form', () => {
        props.modifiedData = { type: 'string', name: 'test' };
        props.actionType = 'edit';

        wrapper = renderComponent(props);
        const compo = wrapper.find(AttributeForm);
        const { handleSubmitAndContinue } = compo.instance();

        handleSubmitAndContinue({ preventDefault: jest.fn() });

        expect(props.onSubmitEdit).toHaveBeenCalledWith(true);
        expect(appContext.emitEvent).toHaveBeenCalledWith(
          'willAddMoreFieldToContentType'
        );
      });

      it('should not submit if the form has an error', () => {
        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { handleSubmitAndContinue } = compo.instance();

        handleSubmitAndContinue({ preventDefault: jest.fn() });

        expect(props.onSubmitEdit).not.toHaveBeenCalled();
        expect(props.onSubmit).not.toHaveBeenCalled();
      });
    });

    describe('HandleToggle', () => {
      it('should clear the search so the modal can be closed', () => {
        wrapper = renderComponent(props);

        const compo = wrapper.find(AttributeForm);
        const { handleToggle } = compo.instance();

        handleToggle();

        expect(props.push).toHaveBeenCalledWith({ search: '' });
      });
    });
  });
});
