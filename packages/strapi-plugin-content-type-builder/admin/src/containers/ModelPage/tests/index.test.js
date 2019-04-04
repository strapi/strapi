import React from 'react';
import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { Redirect, BrowserRouter } from 'react-router-dom';

import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import EmptyAttributesBlock from 'components/EmptyAttributesBlock';

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import AttributeLi from '../../../components/AttributeLi';
import Block from '../../../components/Block';
import LeftMenuLink from '../../../components/LeftMenuLink';

import { clearTemporaryAttribute, onChangeAttribute } from '../../App/actions';

import { ModelPage, mapDispatchToProps } from '../index';

// import CustomLink from '../CustomLink';
import initialData from './initialData.json';

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);

const context = { emitEvent: jest.fn() };
const renderComponent = (props = {}) =>
  mountWithIntl(
    <BrowserRouter>
      <ModelPage {...props} />
    </BrowserRouter>,
    messages,
    context,
  );

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
      deleteModelAttribute: jest.fn(),
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
      onChangeExistingContentTypeMainInfos: jest.fn(),
      onChangeNewContentTypeMainInfos: jest.fn(),
      onChangeAttribute: jest.fn(),
      onChangeRelation: jest.fn(),
      onChangeRelationNature: jest.fn(),
      onChangeRelationTarget: jest.fn(),
      resetEditExistingContentType: jest.fn(),
      resetEditTempContentType: jest.fn(),
      resetExistingContentTypeMainInfos: jest.fn(),
      resetNewContentTypeMainInfos: jest.fn(),
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
      updateTempContentType: jest.fn(),
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

    it("should display the Block if the model's attributes are not empty", () => {
      const wrapper = shallow(<ModelPage {...props} />);

      expect(wrapper.find(Block)).toHaveLength(1);
    });

    it("should display a singular text if the model's attributes relationship is one", () => {
      const wrapper = shallow(<ModelPage {...props} />);

      expect(
        wrapper
          .find(FormattedMessage)
          .last()
          .prop('id'),
      ).toContain('singular');
    });

    it("should display a plural text if the model's attributes relationships is more than one", () => {
      props.match.params.modelName = 'role&source=users-permissions';
      props.match.path = `${basePath}/role&source=users-permissions`;
      const wrapper = shallow(<ModelPage {...props} />);

      expect(
        wrapper
          .find(FormattedMessage)
          .last()
          .prop('id'),
      ).toContain('plural');
    });

    it('should call the handleClickOpenModalChooseAttributes when clicking on the EmptyAttributesBlock', () => {
      props.initialData.product.attributes = {};
      props.modifiedData.product.attributes = {};
      props.match.params.modelName = 'product';
      props.match.path = `${basePath}/product`;

      const wrapper = shallow(<ModelPage {...props} />);
      const spyOnClick = jest.spyOn(wrapper.instance(), 'handleClickOpenModalChooseAttributes');
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
        (props.location.pathname = `${basePath}/test1`), (props.match.params.modelName = 'test1');
        props.newContentType.name = 'test1';

        const { getModel } = shallow(<ModelPage {...props} />).instance();

        expect(getModel()).toEqual(props.newContentType);
      });
    });

    describe('GetModelAttributes', () => {
      it("should return the model's attributes", () => {
        const { getModelAttributes } = shallow(<ModelPage {...props} />).instance();

        expect(getModelAttributes()).toEqual(initialData.user.attributes);
      });
    });

    describe('GetModelAttributesLength', () => {
      it("should return the model's attributes length", () => {
        const { getModelAttributesLength } = shallow(<ModelPage {...props} />).instance();

        expect(getModelAttributesLength()).toEqual(8);
      });
    });

    describe('GetModelDescription', () => {
      it("should return the model's description field", () => {
        const { getModelDescription } = shallow(<ModelPage {...props} />).instance();

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
        const { getModelsNumber } = shallow(<ModelPage {...props} />).instance();

        expect(getModelsNumber()).toEqual(5);
      });
    });

    describe('GetModelRelationShips', () => {
      it('should return the model`s relations', () => {
        const { getModelRelationShips } = shallow(<ModelPage {...props} />).instance();
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

        const { getModelRelationShipsLength } = shallow(<ModelPage {...props} />).instance();

        expect(getModelRelationShipsLength()).toEqual(0);
      });

      it('should return 1 if there is 1 relations', () => {
        const wrapper = shallow(<ModelPage {...props} />);
        const { getModelRelationShipsLength } = wrapper.instance();

        expect(getModelRelationShipsLength()).toEqual(1);
      });
    });

    describe('GetSectionTitle', () => {
      it('should return a singular string for the product', () => {
        props.initialData = { user: props.initialData.user };
        props.modifiedData = { user: props.initialData.user };
        props.models = [props.models[1]];

        const { getSectionTitle } = shallow(<ModelPage {...props} />).instance();

        expect(getSectionTitle()).toContain('singular');
      });

      it('should return a plural string for the user', () => {
        const wrapper = shallow(<ModelPage {...props} />);
        const { getSectionTitle } = wrapper.instance();

        expect(getSectionTitle()).toContain('plural');
      });
    });

    describe('RenderLinks', () => {
      it('should render 5 links in the menu', () => {
        const wrapper = shallow(<ModelPage {...props} />);
        const links = wrapper.find(LeftMenuLink);

        expect(links).toHaveLength(5);
      });
    });

    describe('RenderLi', () => {
      it('should render 8 attributes', () => {
        const wrapper = shallow(<ModelPage {...props} />);
        const links = wrapper.find(AttributeLi);

        expect(links).toHaveLength(8);
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
      deleteModelAttribute: jest.fn(),
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
      onChangeExistingContentTypeMainInfos: jest.fn(),
      onChangeNewContentTypeMainInfos: jest.fn(),
      onChangeAttribute: jest.fn(),
      onChangeRelation: jest.fn(),
      onChangeRelationNature: jest.fn(),
      onChangeRelationTarget: jest.fn(),
      resetEditExistingContentType: jest.fn(),
      resetEditTempContentType: jest.fn(),
      resetExistingContentTypeMainInfos: jest.fn(),
      resetNewContentTypeMainInfos: jest.fn(),
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
      updateTempContentType: jest.fn(),
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

      expect(context.emitEvent).toHaveBeenCalledWith('willEditFieldOfContentType');
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

      expect(context.emitEvent).toHaveBeenCalledWith('willEditFieldOfContentType');
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
      const spyOnDisplayNotification = jest.spyOn(wrapper.instance(), 'displayNotificationCTNotSaved');
      const { handleClickEditModelMainInfos } = wrapper.instance();

      handleClickEditModelMainInfos();

      expect(spyOnWait).toHaveBeenCalled();

      await wait();

      expect(context.emitEvent).not.toHaveBeenCalledWith('willEditNameOfContentType');
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

      expect(context.emitEvent).toHaveBeenCalledWith('willEditNameOfContentType');
      expect(props.history.push).toHaveBeenCalledWith({
        search: 'modalType=model&settingType=base&actionType=edit&modelName=product',
      });
    });
  });

  describe('HandleClickOpenModalChooseAttributes', () => {
    it('should display a notification if thee modal cannot be opened', async () => {
      props.canOpenModal = false;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(ModelPage);

      const spyOnWait = jest.spyOn(wrapper.instance(), 'wait');
      const spyOnDisplayNotification = jest.spyOn(wrapper.instance(), 'displayNotificationCTNotSaved');
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

      expect(context.emitEvent).toHaveBeenCalledWith('willEditNameOfContentType');
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
      const spyOnDisplayNotification = jest.spyOn(wrapper.instance(), 'displayNotificationCTNotSaved');
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
      props.canOpenModal = false;
      topCompo = renderComponent(props);

      const wrapper = topCompo.find(ModelPage);
      const spyOnDisplayNotification = jest.spyOn(wrapper.instance(), 'displayNotificationCTNotSaved');
      const { handleClickOnTrashIcon } = wrapper.instance();

      handleClickOnTrashIcon('username');

      expect(context.emitEvent).not.toHaveBeenCalledWith('willDeleteFieldOfContentType');
      expect(spyOnDisplayNotification).toHaveBeenCalled();
    });

    it('should emit the event willDeleteFieldOfContentType', async () => {
      props.canOpenModal = true;
      topCompo = renderComponent(props);

      const wrapper = topCompo.find(ModelPage);
      const { handleClickOnTrashIcon } = wrapper.instance();

      handleClickOnTrashIcon('username');

      expect(wrapper.state()).toEqual({ showWarning: true, removePrompt: false, attrToDelete: 'username' });
      expect(context.emitEvent).toHaveBeenCalledWith('willDeleteFieldOfContentType');
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
