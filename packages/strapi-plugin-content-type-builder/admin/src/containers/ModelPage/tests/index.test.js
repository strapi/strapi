import React from 'react';
import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash';
import { Redirect, BrowserRouter } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import {
  EmptyAttributesBlock,
  GlobalContextProvider,
  ListHeader,
  ListWrapper,
} from 'strapi-helper-plugin';

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import MenuContext from '../../MenuContext';

import { clearTemporaryAttribute, onChangeAttribute } from '../../App/actions';

import { ModelPage, mapDispatchToProps } from '../index';

import initialData from './initialData.json';
import ViewContainer from '../../ViewContainer';

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);

const appContext = {
  emitEvent: jest.fn(),
  currentEnvironment: 'development',
  disableGlobalOverlayBlocker: jest.fn(),
  enableGlobalOverlayBlocker: jest.fn(),
  plugins: {},
  updatePlugin: jest.fn(),
};
const renderComponent = (props = {}) => {
  const menuContext = {
    canOpenModal: true,
    groups: [],
    models: [],
    push: jest.fn(),
  };
  return mountWithIntl(
    <BrowserRouter>
      <GlobalContextProvider {...appContext}>
        <MenuContext.Provider value={menuContext}>
          <ModelPage {...props} />
        </MenuContext.Provider>
      </GlobalContextProvider>
    </BrowserRouter>,
    messages
  );
};

// @soupette
// TODO update the test when switching to react testing lib

describe('<ModelPage />', () => {
  let props;
  const basePath = '/plugins/content-type-builder/models';

  beforeEach(() => {
    props = {
      addAttributeRelation: jest.fn(),
      addAttributeToExistingContentType: jest.fn(),
      addAttributeToTempContentType: jest.fn(),

      cancelNewContentType: jest.fn(),
      clearTemporaryAttribute: jest.fn(),
      clearTemporaryAttributeRelation: jest.fn(),
      createTempContentType: jest.fn(),
      deleteModel: jest.fn(),
      deleteModelAttribute: jest.fn(),
      deleteTemporaryModel: jest.fn(),
      history: {
        push: jest.fn(),
      },
      location: {
        search: '',
        pathname: `${basePath}/user&source=users-permissions`,
      },
      match: {
        isExact: true,
        params: {
          modelName: 'user&source=users-permissions',
        },
        path: `${basePath}/user&source=users-permissions`,
        url: `${basePath}/:modelName`,
      },
      initialData: cloneDeep(initialData),
      modifiedData: cloneDeep(initialData),
      models: [
        {
          icon: 'fa-cube',
          name: 'permission',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
        {
          icon: 'fa-cube',
          name: 'user',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
        {
          icon: 'fa-cube',
          name: 'role',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
        {
          icon: 'fa-cube',
          name: 'product',
          description: 'super api',
          fields: 6,
          isTemporary: false,
        },
        {
          icon: 'fa-cube',
          name: 'test1',
          description: 'super api',
          fields: 6,
          isTemporary: true,
        },
      ],
      newContentType: {
        collectionName: '',
        connection: '',
        description: '',
        mainField: '',
        name: '',
        attributes: {},
      },
      onChangeAttribute: jest.fn(),
      onChangeRelation: jest.fn(),
      onChangeRelationNature: jest.fn(),
      onChangeRelationTarget: jest.fn(),
      resetEditExistingContentType: jest.fn(),
      resetEditTempContentType: jest.fn(),

      saveEditedAttribute: jest.fn(),
      saveEditedAttributeRelation: jest.fn(),
      setTemporaryAttribute: jest.fn(),
      setTemporaryAttributeRelation: jest.fn(),
      submitContentType: jest.fn(),
      submitTempContentType: jest.fn(),
      temporaryAttribute: {},
      temporaryAttributeRelation: {
        name: '',
        columnName: '',
        dominant: false,
        targetColumnName: '',
        key: '-',
        nature: 'oneWay',
        plugin: '',
        target: '',
        unique: false,
      },
    };
  });

  it('should not crash', () => {
    shallow(<ModelPage {...props} />);
  });

  describe('CTB <ModelPage /> render', () => {
    it('should redirect the user if the modelName does not exist in its models props', () => {
      props.match.params.modelName = 'test';

      const wrapper = shallow(<ModelPage {...props} />);
      const redirect = wrapper.find(Redirect);

      expect(redirect.length).toEqual(1);
    });
    it("should display the EmptyAttributeBlock if the model's attributes are empty", () => {
      props.initialData.user.attributes = {};
      props.modifiedData.user.attributes = {};

      const wrapper = shallow(<ModelPage {...props} />);

      expect(wrapper.find(EmptyAttributesBlock)).toHaveLength(1);
    });

    it("should display the ListWrapper if the model's attributes are not empty", () => {
      const wrapper = shallow(<ModelPage {...props} />);

      expect(wrapper.find(ListWrapper)).toHaveLength(1);
    });

    it("should display a singular text if the model's attributes relationship is one", () => {
      const wrapper = shallow(<ModelPage {...props} />);

      const { id } = wrapper
        .find(ListHeader)
        .find(FormattedMessage)
        .last()
        .props();

      expect(id).toContain('relations.title.singular');
    });

    it("should display a plural text if the model's attributes relationships is more than one", () => {
      props.match.params.modelName = 'role&source=users-permissions';
      props.match.path = `${basePath}/role&source=users-permissions`;
      const wrapper = shallow(<ModelPage {...props} />);
      const list = wrapper.find(ListHeader);

      expect(list.find(FormattedMessage)).toHaveLength(2);

      const { id } = list
        .find(FormattedMessage)
        .last()
        .props();

      expect(id).toContain('relations.title.plural');
    });

    it('should call the handleClickOpenModalChooseAttributes when clicking on the EmptyAttributesBlock', () => {
      props.initialData.product.attributes = {};
      props.modifiedData.product.attributes = {};
      props.match.params.modelName = 'product';
      props.match.path = `${basePath}/product`;

      const wrapper = shallow(<ModelPage {...props} />);
      const spyOnClick = jest.spyOn(
        wrapper.instance(),
        'handleClickOpenModalChooseAttributes'
      );
      wrapper.instance().forceUpdate();

      const onClick = wrapper.find(EmptyAttributesBlock).prop('onClick');
      onClick();

      expect(spyOnClick).toHaveBeenCalled();
    });
  });

  describe('CTB <ModelPage /> instances', () => {
    describe('GetModel', () => {
      it('should return the correct model', () => {
        const { getModel } = shallow(<ModelPage {...props} />).instance();

        expect(getModel()).toEqual(initialData.user);
      });

      it('should return the newContentType if the url matches', () => {
        (props.location.pathname = `${basePath}/test1`),
          (props.match.params.modelName = 'test1');
        props.newContentType.name = 'test1';

        const { getModel } = shallow(<ModelPage {...props} />).instance();

        expect(getModel()).toEqual(props.newContentType);
      });
    });

    describe('GetModelAttributes', () => {
      it("should return the model's attributes", () => {
        const { getModelAttributes } = shallow(
          <ModelPage {...props} />
        ).instance();

        expect(getModelAttributes()).toEqual(initialData.user.attributes);
      });
    });

    describe('GetModelAttributesLength', () => {
      it("should return the model's attributes length", () => {
        const { getModelAttributesLength } = shallow(
          <ModelPage {...props} />
        ).instance();

        expect(getModelAttributesLength()).toEqual(8);
      });
    });

    describe('GetModelDescription', () => {
      it("should return the model's description field", () => {
        const { getModelDescription } = shallow(
          <ModelPage {...props} />
        ).instance();

        expect(getModelDescription()).toEqual('user model');
      });
    });

    describe('GetModelName', () => {
      it("should return the model's name field", () => {
        const { getModelName } = shallow(<ModelPage {...props} />).instance();

        expect(getModelName()).toEqual('user');
      });
    });

    describe('GetModelsNumber', () => {
      it('should return the number of models', () => {
        const { getModelsNumber } = shallow(
          <ModelPage {...props} />
        ).instance();

        expect(getModelsNumber()).toEqual(5);
      });
    });

    describe('GetModelRelationShips', () => {
      it('should return the model`s relations', () => {
        const { getModelRelationShips } = shallow(
          <ModelPage {...props} />
        ).instance();
        const {
          user: {
            attributes: { role },
          },
        } = initialData;

        expect(getModelRelationShips()).toEqual({ role });
      });
    });

    describe('GetModelRelationShipsLength', () => {
      it('should return 0 if there is no relation', () => {
        props.match.params.modelName = 'product';
        props.match.path = `${basePath}/product`;

        const { getModelRelationShipsLength } = shallow(
          <ModelPage {...props} />
        ).instance();

        expect(getModelRelationShipsLength()).toEqual(0);
      });

      it('should return 1 if there is 1 relations', () => {
        const wrapper = shallow(<ModelPage {...props} />);
        const { getModelRelationShipsLength } = wrapper.instance();

        expect(getModelRelationShipsLength()).toEqual(1);
      });
    });

    describe('RenderViewContainer', () => {
      it('should render a ViewContainer', () => {
        const wrapper = shallow(<ModelPage {...props} />);
        const viewContainer = wrapper.find(ViewContainer);

        expect(viewContainer).toHaveLength(1);
      });
    });
  });
});

const wait = async () => new Promise(resolve => setTimeout(resolve, 100));

describe('<ModelPage /> lifecycle', () => {
  let props;
  let topCompo;
  const basePath = '/plugins/content-type-builder/models';

  beforeEach(() => {
    props = {
      addAttributeRelation: jest.fn(),
      addAttributeToExistingContentType: jest.fn(),
      addAttributeToTempContentType: jest.fn(),

      cancelNewContentType: jest.fn(),
      canOpenModal: true,
      clearTemporaryAttribute: jest.fn(),
      clearTemporaryAttributeRelation: jest.fn(),
      createTempContentType: jest.fn(),
      deleteModel: jest.fn(),
      deleteModelAttribute: jest.fn(),
      deleteTemporaryModel: jest.fn(),
      history: {
        push: jest.fn(),
      },
      location: {
        search: '',
        pathname: `${basePath}/product`,
      },
      match: {
        isExact: true,
        params: {
          modelName: 'product',
        },
        path: `${basePath}/product`,
        url: `${basePath}/:modelName`,
      },
      initialData: cloneDeep(initialData),
      modifiedData: cloneDeep(initialData),
      models: [
        {
          icon: 'fa-cube',
          name: 'permission',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
        {
          icon: 'fa-cube',
          name: 'user',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
        {
          icon: 'fa-cube',
          name: 'role',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
        {
          icon: 'fa-cube',
          name: 'product',
          description: 'super api',
          fields: 6,
          isTemporary: false,
        },
        {
          icon: 'fa-cube',
          name: 'test1',
          description: 'super api',
          fields: 6,
          isTemporary: true,
        },
      ],
      newContentType: {
        collectionName: '',
        connection: '',
        description: '',
        mainField: '',
        name: '',
        attributes: {},
      },
      onChangeAttribute: jest.fn(),
      onChangeRelation: jest.fn(),
      onChangeRelationNature: jest.fn(),
      onChangeRelationTarget: jest.fn(),
      resetEditExistingContentType: jest.fn(),
      resetEditTempContentType: jest.fn(),
      saveEditedAttribute: jest.fn(),
      saveEditedAttributeRelation: jest.fn(),
      setTemporaryAttribute: jest.fn(),
      setTemporaryAttributeRelation: jest.fn(),
      submitContentType: jest.fn(),
      submitTempContentType: jest.fn(),
      temporaryAttribute: {},
      temporaryAttributeRelation: {
        name: '',
        columnName: '',
        dominant: false,
        targetColumnName: '',
        key: '-',
        nature: 'oneWay',
        plugin: '',
        target: '',
        unique: false,
      },
    };
  });

  afterEach(() => {
    topCompo.unmount();
  });

  describe('HandleClickEditAttribute', () => {
    it('should emit the event editFieldOfContentType', async () => {
      topCompo = renderComponent(props);
      const wrapper = topCompo.find(ModelPage);

      const spyOnWait = jest.spyOn(wrapper.instance(), 'wait');
      const { handleClickEditAttribute } = wrapper.instance();

      handleClickEditAttribute('username', 'string');

      expect(spyOnWait).toHaveBeenCalled();

      await wait();

      expect(appContext.emitEvent).toHaveBeenCalledWith(
        'willEditFieldOfContentType'
      );
      expect(props.history.push).toHaveBeenCalledWith({
        search:
          'modalType=attributeForm&attributeType=string&settingType=base&actionType=edit&attributeName=username',
      });
    });

    it('should handle the <number> type correctly', async () => {
      topCompo = renderComponent(props);
      const wrapper = topCompo.find(ModelPage);

      const spyOnWait = jest.spyOn(wrapper.instance(), 'wait');
      const { handleClickEditAttribute } = wrapper.instance();

      handleClickEditAttribute('username', 'float');

      expect(spyOnWait).toHaveBeenCalled();

      await wait();

      expect(appContext.emitEvent).toHaveBeenCalledWith(
        'willEditFieldOfContentType'
      );
      expect(props.history.push).toHaveBeenCalledWith({
        search:
          'modalType=attributeForm&attributeType=number&settingType=base&actionType=edit&attributeName=username',
      });
    });
  });

  describe('HandleClickEditModelMainInfos', () => {
    it('should display a notification if thee modal cannot be opened', async () => {
      props.canOpenModal = false;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(ModelPage);

      const spyOnWait = jest.spyOn(wrapper.instance(), 'wait');
      const spyOnDisplayNotification = jest.spyOn(
        wrapper.instance(),
        'displayNotificationCTNotSaved'
      );
      const { handleClickEditModelMainInfos } = wrapper.instance();

      handleClickEditModelMainInfos();

      expect(spyOnWait).toHaveBeenCalled();

      await wait();

      expect(appContext.emitEvent).not.toHaveBeenCalledWith(
        'willEditNameOfContentType'
      );
      expect(props.history.push).not.toHaveBeenCalled();
      expect(spyOnDisplayNotification).toHaveBeenCalled();
    });

    it('should emit the event editFieldOfContentType', async () => {
      props.canOpenModal = true;
      topCompo = renderComponent(props);
      const wrapper = topCompo.find(ModelPage);

      const spyOnWait = jest.spyOn(wrapper.instance(), 'wait');
      const { handleClickEditModelMainInfos } = wrapper.instance();

      handleClickEditModelMainInfos();

      expect(spyOnWait).toHaveBeenCalled();

      await wait();

      expect(appContext.emitEvent).toHaveBeenCalledWith(
        'willEditNameOfContentType'
      );
      expect(props.history.push).toHaveBeenCalledWith({
        search:
          'modalType=model&settingType=base&actionType=edit&modelName=product',
      });
    });
  });

  describe('HandleClickOpenModalChooseAttributes', () => {
    it('should display a notification if thee modal cannot be opened', async () => {
      props.canOpenModal = false;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(ModelPage);

      const spyOnWait = jest.spyOn(wrapper.instance(), 'wait');
      const spyOnDisplayNotification = jest.spyOn(
        wrapper.instance(),
        'displayNotificationCTNotSaved'
      );
      const { handleClickOpenModalChooseAttributes } = wrapper.instance();

      handleClickOpenModalChooseAttributes();

      expect(spyOnWait).toHaveBeenCalled();

      await wait();

      expect(props.history.push).not.toHaveBeenCalled();
      expect(spyOnDisplayNotification).toHaveBeenCalled();
    });

    it('should emit the event editFieldOfContentType', async () => {
      props.canOpenModal = true;
      topCompo = renderComponent(props);
      const wrapper = topCompo.find(ModelPage);

      const spyOnWait = jest.spyOn(wrapper.instance(), 'wait');
      const { handleClickOpenModalChooseAttributes } = wrapper.instance();

      handleClickOpenModalChooseAttributes();

      expect(spyOnWait).toHaveBeenCalled();

      await wait();

      expect(appContext.emitEvent).toHaveBeenCalledWith(
        'willEditNameOfContentType'
      );
      expect(props.history.push).toHaveBeenCalledWith({
        search: 'modalType=chooseAttributes',
      });
    });
  });

  describe('handleClickOpenModalCreateCT', () => {
    it('should display a notification if thee modal cannot be opened', async () => {
      props.canOpenModal = false;
      topCompo = renderComponent(props);

      const wrapper = topCompo.find(ModelPage);
      const spyOnDisplayNotification = jest.spyOn(
        wrapper.instance(),
        'displayNotificationCTNotSaved'
      );
      const { handleClickOpenModalCreateCT } = wrapper.instance();

      handleClickOpenModalCreateCT();

      expect(props.history.push).not.toHaveBeenCalled();
      expect(spyOnDisplayNotification).toHaveBeenCalled();
    });

    it('should emit the event editFieldOfContentType', async () => {
      props.canOpenModal = true;
      topCompo = renderComponent(props);

      const wrapper = topCompo.find(ModelPage);
      const { handleClickOpenModalCreateCT } = wrapper.instance();

      handleClickOpenModalCreateCT();

      expect(props.history.push).toHaveBeenCalledWith({
        search: 'modalType=model&settingType=base&actionType=create',
      });
    });
  });

  describe('HandleClickOnTrashIcon', () => {
    it('should display a notification if thee modal cannot be opened', async () => {
      props.models.find(item => item.name == 'product').isTemporary = false;
      props.canOpenModal = false;

      topCompo = renderComponent(props);

      const wrapper = topCompo.find(ModelPage);
      const spyOnDisplayNotification = jest.spyOn(
        wrapper.instance(),
        'displayNotificationCTNotSaved'
      );
      const { handleClickOnTrashIcon } = wrapper.instance();

      handleClickOnTrashIcon('username');

      expect(spyOnDisplayNotification).toHaveBeenCalled();
      expect(appContext.emitEvent).not.toHaveBeenCalledWith(
        'willDeleteFieldOfContentType'
      );
    });

    it('should emit the event willDeleteFieldOfContentType', async () => {
      props.canOpenModal = true;
      topCompo = renderComponent(props);

      const wrapper = topCompo.find(ModelPage);
      const { handleClickOnTrashIcon } = wrapper.instance();

      handleClickOnTrashIcon('username');

      expect(wrapper.state()).toEqual({
        showDeleteAttrWarning: true,
        showDeleteWarning: false,
        removePrompt: false,
        attrToDelete: 'username',
      });
      expect(appContext.emitEvent).toHaveBeenCalledWith(
        'willDeleteFieldOfContentType'
      );
    });
  });

  describe('deleteModelAttribute', () => {
    it('should call deleteModelAttribute with modifiedDataGroup path when isTemporary is false', () => {
      props.models.find(item => item.name == 'product').isTemporary = false;
      props.canOpenModal = true;

      topCompo = renderComponent(props);

      const wrapper = topCompo.find(ModelPage);
      const {
        handleClickOnTrashIcon,
        handleDeleteAttribute,
      } = wrapper.instance();

      handleClickOnTrashIcon('username');
      handleDeleteAttribute();

      const keys = ['modifiedData', 'product', 'attributes', 'username'];
      expect(props.deleteModelAttribute).toHaveBeenCalledWith(keys);
    });

    it('should call deleteModelAttribute with newGroup path when isTemporary is true', () => {
      props.models.find(item => item.name == 'product').isTemporary = true;
      props.canOpenModal = true;

      topCompo = renderComponent(props);

      const wrapper = topCompo.find(ModelPage);
      const {
        handleClickOnTrashIcon,
        handleDeleteAttribute,
      } = wrapper.instance();

      handleClickOnTrashIcon('username');
      handleDeleteAttribute();
      const keys = ['newContentType', 'attributes', 'username'];
      expect(props.deleteModelAttribute).toHaveBeenCalledWith(keys);
    });
  });

  describe('toggleDeleteAttrModalWarning', () => {
    it('should change the showDeleteAttrWarning on modal toggle', () => {
      topCompo = renderComponent(props);

      const wrapper = topCompo.find(ModelPage);
      expect(wrapper.state()).toEqual({
        attrToDelete: null,
        showDeleteAttrWarning: false,
        showDeleteWarning: false,
        removePrompt: false,
      });

      const { toggleDeleteAttrModalWarning } = wrapper.instance();

      toggleDeleteAttrModalWarning();

      expect(wrapper.state()).toEqual({
        attrToDelete: null,
        showDeleteAttrWarning: true,
        showDeleteWarning: false,
        removePrompt: false,
      });
    });
  });
});

describe('CTB <ModelPage />, mapDispatchToProps', () => {
  describe('ClearTemporaryAttribute', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.clearTemporaryAttribute).toBeDefined();
    });

    it('should dispatch the clearTemporaryAttribute action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.clearTemporaryAttribute();

      expect(dispatch).toHaveBeenCalledWith(clearTemporaryAttribute());
    });
  });

  describe('onChangeAttribute', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.onChangeAttribute).toBeDefined();
    });

    it('should dispatch the onChangeAttribute action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      const target = { name: '' };
      result.onChangeAttribute({ target });

      expect(dispatch).toHaveBeenCalledWith(onChangeAttribute({ target }));
    });
  });
});
