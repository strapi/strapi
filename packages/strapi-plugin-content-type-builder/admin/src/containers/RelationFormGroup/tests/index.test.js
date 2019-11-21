import React from 'react';
import { GlobalContextProvider } from 'strapi-helper-plugin';
import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';
import RelationFormGroup from '../index';

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
      <RelationFormGroup {...props} />
    </GlobalContextProvider>,
    messages
  );

describe('<RelationFormGroup />', () => {
  let props;
  let wrapper;

  beforeEach(() => {
    props = {
      activeTab: 'base',
      alreadyTakenAttributes: [],
      attributeToEditName: '',
      attributeToEditIndex: null,
      isOpen: true,
      features: [],
      featureToEditName: '',
      modifiedData: {
        key: '',
        name: '',
        source: '',
      },
      onCancel: jest.fn(),
      onChange: jest.fn(),
      onChangeRelationNature: jest.fn(),
      onChangeRelationTarget: jest.fn(),
      onSubmit: jest.fn(),
      onSubmitEdit: jest.fn(),
      setTempAttribute: jest.fn(),
      push: jest.fn(),
      source: null,
    };
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('should not crash', () => {
    wrapper = renderComponent(props);
  });

  it('should render the advanced tab if the active tab is advanced', () => {
    props.activeTab = 'advanced';

    wrapper = renderComponent(props);
    const compo = wrapper.find(RelationFormGroup);
    const spyOnRenderAdvancedSettings = jest.spyOn(
      compo.instance(),
      'renderAdvancedSettings'
    );
    compo.instance().forceUpdate();

    expect(spyOnRenderAdvancedSettings).toHaveBeenCalled();
  });

  describe('GetFormErrors', () => {
    it('should return an object with the errors if the form is empty', () => {
      wrapper = renderComponent(props);
      const { getFormErrors } = wrapper.find(RelationFormGroup).instance();

      expect(getFormErrors()).toEqual({
        name: [{ id: 'content-type-builder.error.validation.required' }],
        key: [{ id: 'content-type-builder.error.validation.required' }],
      });
    });

    it('should return an object if a name is already taken', () => {
      props.alreadyTakenAttributes = ['test'];
      props.modifiedData.name = 'test';
      props.modifiedData.key = 'strapi';

      wrapper = renderComponent(props);
      const { getFormErrors } = wrapper.find(RelationFormGroup).instance();

      expect(getFormErrors()).toEqual({
        name: [{ id: 'content-type-builder.error.attribute.key.taken' }],
      });
    });

    it('should return an error if the key is equal to the name', () => {
      props.alreadyTakenAttributes = [];
      props.modifiedData.name = 'test';
      props.modifiedData.key = 'test';

      wrapper = renderComponent(props);
      const { getFormErrors } = wrapper.find(RelationFormGroup).instance();

      expect(getFormErrors()).toEqual({
        key: [{ id: 'content-type-builder.error.attribute.key.taken' }],
      });
    });

    it('should not return an error when editing', () => {
      props.alreadyTakenAttributes = ['test', 'strapi'];
      props.modifiedData.name = 'test';
      props.modifiedData.key = 'strapi';
      props.actionType = 'edit';
      props.attributeToEditName = 'test';

      wrapper = renderComponent(props);
      const { getFormErrors } = wrapper.find(RelationFormGroup).instance();

      expect(getFormErrors()).toEqual({});
    });
  });

  describe('<RelationFormGroup />, basic instances', () => {
    describe('HandleChangeRelationTarget', () => {
      it('should call the onChangeRelationTarget with the correct data (not editing)', () => {
        props.featureToEditName = 'test';

        wrapper = renderComponent(props);
        const { handleChangeRelationTarget } = wrapper
          .find(RelationFormGroup)
          .instance();

        handleChangeRelationTarget('strapi');

        expect(props.onChangeRelationTarget).toHaveBeenLastCalledWith(
          'strapi',
          'test',
          false
        );
      });

      it('should call the onChangeRelationTarget with the correct data (editing)', () => {
        props.featureToEditName = 'test';
        props.actionType = 'edit';

        wrapper = renderComponent(props);
        const { handleChangeRelationTarget } = wrapper
          .find(RelationFormGroup)
          .instance();

        handleChangeRelationTarget('strapi');

        expect(props.onChangeRelationTarget).toHaveBeenLastCalledWith(
          'strapi',
          'test',
          true
        );
      });
    });

    describe('HandleCancel', () => {
      it('should clear the search', () => {
        wrapper = renderComponent(props);
        const { handleCancel } = wrapper.find(RelationFormGroup).instance();

        handleCancel();

        expect(props.push).toHaveBeenCalledWith({ search: '' });
      });
    });

    describe('HandleGoTo', () => {
      it('should not emit the event if the tab is base', () => {
        wrapper = renderComponent(props);
        const { handleGoTo } = wrapper.find(RelationFormGroup).instance();

        handleGoTo('base');

        expect(props.push).toHaveBeenCalledWith({
          search:
            'modalType=attributeForm&attributeType=relation&settingType=base&actionType=create',
        });
        expect(appContext.emitEvent).not.toHaveBeenCalled();
      });

      it('should emit the event didSelectContentTypeFieldSettings if the user clicks on the advanced tab', () => {
        wrapper = renderComponent(props);
        const { handleGoTo } = wrapper.find(RelationFormGroup).instance();

        handleGoTo('advanced');

        expect(props.push).toHaveBeenCalledWith({
          search:
            'modalType=attributeForm&attributeType=relation&settingType=advanced&actionType=create',
        });
        expect(appContext.emitEvent).toHaveBeenCalledWith(
          'didSelectContentTypeFieldSettings'
        );
      });

      it('should add the keep the attribute name if the action is edit', () => {
        props.actionType = 'edit';
        props.attributeToEditName = 'test';
        wrapper = renderComponent(props);
        const { handleGoTo } = wrapper.find(RelationFormGroup).instance();

        handleGoTo('advanced');

        expect(props.push).toHaveBeenCalledWith({
          search:
            'modalType=attributeForm&attributeType=relation&settingType=advanced&actionType=edit&attributeName=test',
        });
        expect(appContext.emitEvent).toHaveBeenCalledWith(
          'didSelectContentTypeFieldSettings'
        );
      });
    });

    describe('HandleOnClosed', () => {
      it('should update the state and call the onCancel prop', () => {
        wrapper = renderComponent(props);
        const compo = wrapper.find(RelationFormGroup);
        compo.setState({ showForm: true, formErrors: { name: [] } });

        expect(compo.state('showForm')).toBeTruthy();

        const { handleOnClosed } = compo.instance();

        handleOnClosed();

        expect(compo.state('formErrors')).toEqual({});
        expect(compo.state('showForm')).toBeFalsy();
        expect(props.onCancel).toHaveBeenCalled();
      });
    });

    describe('HandleOnOpened', () => {
      it('should update the state and call the setTempAttribute prop on create modal open', () => {
        props.features = [{ name: 'test' }];
        props.featureToEditName = 'strapi';
        props.actionType = 'create';
        props.attributeToEditIndex = 1;
        props.attributeToEditName = 'test';
        props.isUpdatingTemporary = false;
        wrapper = renderComponent(props);
        const compo = wrapper.find(RelationFormGroup);

        expect(compo.state('showForm')).toBeFalsy();

        const { handleOnOpened } = compo.instance();

        handleOnOpened();

        expect(compo.state('showForm')).toBeTruthy();
        expect(props.setTempAttribute).toHaveBeenCalledWith(
          'test',
          false,
          undefined,
          1,
          'test',
          false
        );
      });
      it('should update the state and call the setTempAttribute props on edit modal open', () => {
        props.features = [{ name: 'test' }];
        props.featureToEditName = 'strapi';
        props.actionType = 'edit';
        props.attributeToEditIndex = 1;
        props.attributeToEditName = 'test';
        props.isUpdatingTemporary = true;

        wrapper = renderComponent(props);
        const compo = wrapper.find(RelationFormGroup);

        expect(compo.state('showForm')).toBeFalsy();

        const { handleOnOpened } = compo.instance();

        handleOnOpened();

        expect(compo.state('showForm')).toBeTruthy();
        expect(props.setTempAttribute).toHaveBeenCalledWith(
          'strapi',
          true,
          undefined,
          1,
          'test',
          true
        );
      });
    });

    describe('HandleSubmit', () => {
      it('should call the submit prop if there is no error', () => {
        props.modifiedData = {
          name: 'test',
          nature: 'oneWay',
          target: 'test',
          key: '-',
        };
        wrapper = renderComponent(props);
        const { handleSubmit } = wrapper.find(RelationFormGroup).instance();

        handleSubmit({ preventDefault: jest.fn() });

        expect(props.onSubmit).toHaveBeenCalledWith(false);
      });

      it('should not call the submit if the form is empty', () => {
        wrapper = renderComponent(props);
        const { handleSubmit } = wrapper.find(RelationFormGroup).instance();

        handleSubmit({ preventDefault: jest.fn() });

        expect(props.onSubmit).not.toHaveBeenCalled();
      });
    });

    describe('HandleSubmitAndContinue', () => {
      it('should call the submit prop if there is no error', () => {
        props.modifiedData = {
          name: 'test',
          nature: 'oneWay',
          target: 'test',
          key: '-',
        };
        wrapper = renderComponent(props);
        const { handleSubmitAndContinue } = wrapper
          .find(RelationFormGroup)
          .instance();

        handleSubmitAndContinue({ preventDefault: jest.fn() });

        expect(props.onSubmit).toHaveBeenCalledWith(true);
      });

      it('should not call the submit if the form is empty', () => {
        wrapper = renderComponent(props);
        const { handleSubmitAndContinue } = wrapper
          .find(RelationFormGroup)
          .instance();

        handleSubmitAndContinue({ preventDefault: jest.fn() });

        expect(props.onSubmit).not.toHaveBeenCalled();
      });
    });

    describe('HandleToggle', () => {
      it('should clear the search', () => {
        wrapper = renderComponent(props);
        const { handleToggle } = wrapper.find(RelationFormGroup).instance();

        handleToggle();

        expect(props.push).toHaveBeenCalledWith({ search: '' });
      });
    });
    describe('Submit', () => {
      it('should call the onSubmitEditProp if the actionType is edit', () => {
        props.actionType = 'edit';
        wrapper = renderComponent(props);

        const { submit } = wrapper.find(RelationFormGroup).instance();

        submit();

        expect(props.onSubmitEdit).toHaveBeenCalledWith(false);
      });

      it('should call the onSubmitEdit if the actionType is create', () => {
        wrapper = renderComponent(props);

        const { submit } = wrapper.find(RelationFormGroup).instance();

        submit(true);

        expect(props.onSubmit).toHaveBeenCalledWith(true);
      });
    });
  });
});
