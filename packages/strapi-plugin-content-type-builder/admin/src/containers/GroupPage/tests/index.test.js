import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { shallow } from 'enzyme';

import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import { EmptyAttributesBlock, ListHeader } from 'strapi-helper-plugin';

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import MenuContext from '../../MenuContext';
import ViewContainer from '../../ViewContainer';

import { GroupPage, mapDispatchToProps } from '../index';

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);

const context = { emitEvent: jest.fn() };
const renderComponent = (props = {}) => {
  const menuContext = {
    canOpenModal: true,
    groups: [],
    models: [],
    push: jest.fn(),
  };
  return mountWithIntl(
    <BrowserRouter>
      <MenuContext.Provider value={menuContext}>
        <GroupPage {...props} />
      </MenuContext.Provider>
    </BrowserRouter>,
    messages,
    context
  );
};

const basePath = '/plugins/content-type-builder/groups';
const props = {
  addAttributeToExistingGroup: jest.fn(),
  addAttributeToTempGroup: jest.fn(),
  clearTemporaryAttributeGroup: jest.fn(),
  deleteGroupAttribute: jest.fn(),
  groups: [
    {
      icon: 'fa-cube',
      name: 'tests',
      description: '',
      fields: 2,
      source: null,
      isTemporary: false,
    },
  ],
  history: {
    push: jest.fn(),
  },
  initialDataGroup: {
    tests: {
      uid: 'tests',
      name: 'Tests',
      source: null,
      schema: {
        connection: 'default',
        collectionName: 'tests',
        description: 'tests description',
        attributes: [
          {
            name: 'name',
            type: 'string',
            required: true,
          },
          {
            name: 'quantity',
            type: 'float',
            required: true,
          },
        ],
      },
    },
  },
  location: {
    search: '',
    pathname: `${basePath}/tests`,
  },
  modifiedDataGroup: {
    tests: {
      uid: 'tests',
      name: 'Tests',
      source: null,
      schema: {
        connection: 'default',
        collectionName: 'tests',
        description: 'tests description',
        attributes: [
          {
            name: 'name',
            type: 'string',
            required: true,
          },
          {
            name: 'quantity',
            type: 'float',
            required: true,
          },
        ],
      },
    },
  },
  match: {
    params: {
      groupName: 'tests',
    },
  },
  newGroup: {
    collectionName: '',
    connection: '',
    name: '',
    schema: {
      attributes: [],
      description: '',
    },
  },
  onChangeAttributeGroup: jest.fn(),
  resetEditTempGroup: jest.fn(),
  saveEditedAttributeGroup: jest.fn(),
  setTemporaryAttributeGroup: jest.fn(),
  submitTempGroup: jest.fn(),
  submitGroup: jest.fn(),
  temporaryAttributeGroup: {},
};

describe('CTB <GroupPage />', () => {
  it('should not crash', () => {
    shallow(<GroupPage {...props} />);
  });

  describe('GetFeatureHeaderDescription', () => {
    it("should return the group's description field", () => {
      const { getFeatureHeaderDescription } = shallow(
        <GroupPage {...props} />
      ).instance();

      expect(getFeatureHeaderDescription()).toEqual('tests description');
    });
  });

  describe('GetFeatureName', () => {
    it("should return the group's name", () => {
      const { getFeatureName } = shallow(<GroupPage {...props} />).instance();

      expect(getFeatureName()).toEqual('tests');
    });
  });

  describe('GetFeature', () => {
    it('should return the correct group', () => {
      const { getFeature } = shallow(<GroupPage {...props} />).instance();

      expect(getFeature()).toEqual(props.modifiedDataGroup.tests);
    });
    it('should return newGroup if isTemporary is true', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = true;

      const { getFeature } = shallow(<GroupPage {...props} />).instance();

      expect(getFeature()).toEqual(props.newGroup);
    });
  });

  describe('GetSource', () => {
    it("should return the correct group's source if it exists", () => {
      const source = 'users-permissions';
      props.match.params.groupName = `tests&source=${source}`;

      const { getSource } = shallow(<GroupPage {...props} />).instance();

      expect(getSource()).toEqual(source);

      props.match.params.groupName = `tests`;
    });

    it("should return null if the group's source does not exist", () => {
      const { getSource } = shallow(<GroupPage {...props} />).instance();

      expect(getSource()).toEqual(null);
    });
  });

  describe('HandleGoBack', () => {
    it('should go to previous page', () => {
      const { handleGoBack } = shallow(<GroupPage {...props} />).instance();
      handleGoBack();

      expect(props.history.push).toHaveBeenCalledWith(
        '/plugins/content-type-builder/groups'
      );
    });
  });

  describe('ToggleModalWarning', () => {
    const wrapper = shallow(<GroupPage {...props} />);
    expect(wrapper.state()).toEqual({
      showWarning: false,
      attrToDelete: null,
    });

    const { toggleModalWarning } = wrapper.instance();

    toggleModalWarning();

    expect(wrapper.state()).toEqual({
      showWarning: true,
      attrToDelete: null,
    });
  });

  describe('ComponentDidMount', () => {
    props.location.search = `modalType=attributeForm&attributeType=string&settingType=base&actionType=edit&attributeName=0`;
    shallow(<GroupPage {...props} />);

    expect(props.setTemporaryAttributeGroup).toHaveBeenCalledWith(
      '0',
      false,
      'tests'
    );
  });

  it('should call the openAttributesModal when clicking on the EmptyAttributesBlock', () => {
    props.initialDataGroup.tests.schema.attributes = [];
    props.modifiedDataGroup.tests.schema.attributes = [];
    props.newGroup.schema.attributes = [];

    const wrapper = shallow(<GroupPage {...props} />);
    const spyOnClick = jest.spyOn(wrapper.instance(), 'openAttributesModal');
    wrapper.instance().forceUpdate();

    expect(wrapper.find(EmptyAttributesBlock)).toHaveLength(1);

    const onClick = wrapper.find(EmptyAttributesBlock).prop('onClick');
    onClick();

    expect(spyOnClick).toHaveBeenCalled();
  });
});

describe('CTB <GroupPage />, mapDispatchToProps', () => {
  it('should be injected', () => {
    const dispatch = jest.fn();
    const result = mapDispatchToProps(dispatch);

    expect(result.deleteGroupAttribute).toBeDefined();
  });
});

describe('CTB <GroupPage />, lifecycle', () => {
  let topCompo;

  afterEach(() => {
    topCompo.unmount();
  });

  describe('OpenAttributesModal', () => {
    it('should display a notification if thee modal cannot be opened', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = false;
      props.canOpenModal = false;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const spyOnDisplayNotification = jest.spyOn(
        wrapper.instance(),
        'displayNotificationCTNotSaved'
      );
      const { openAttributesModal } = wrapper.instance();
      openAttributesModal();

      expect(spyOnDisplayNotification).toHaveBeenCalled();
    });
  });

  describe('HandleClickEditAttribute', () => {
    it('should display a notification if thee modal cannot be opened', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = false;
      props.canOpenModal = false;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const spyOnDisplayNotification = jest.spyOn(
        wrapper.instance(),
        'displayNotificationCTNotSaved'
      );
      const { handleClickEditAttribute } = wrapper.instance();
      handleClickEditAttribute(0, 'string');

      expect(spyOnDisplayNotification).toHaveBeenCalled();
    });

    it('should call setTempororaryAttributeGroup if ifTemporary is true', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = true;
      props.canOpenModal = true;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const { handleClickEditAttribute } = wrapper.instance();
      handleClickEditAttribute(0, 'string');

      expect(props.setTemporaryAttributeGroup).toHaveBeenCalledWith(
        0,
        true,
        'tests'
      );
    });

    it('should handle the <number> type correctly', () => {
      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);

      const { handleClickEditAttribute } = wrapper.instance();

      handleClickEditAttribute(0, 'float');

      expect(context.emitEvent).toHaveBeenCalledWith('willEditFieldOfGroup');
      expect(props.history.push).toHaveBeenCalledWith({
        search:
          'modalType=attributeForm&attributeType=number&settingType=base&actionType=edit&attributeName=0',
      });
    });
  });

  describe('HandleSubmit', () => {
    it('should call addAttributeToTempGroup when isTemporary is true', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = true;
      props.canOpenModal = true;

      const search = 'chooseAttributes';
      props.location.search = `attributeType=${search}`;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const { handleSubmit } = wrapper.instance();

      handleSubmit();

      expect(props.addAttributeToTempGroup).toHaveBeenCalledWith(search);
    });

    it('should call addAttributeToExistingGroup when isTemporary is false', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = false;
      props.canOpenModal = true;

      const search = 'chooseAttributes';
      props.location.search = `attributeType=${search}`;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const { handleSubmit } = wrapper.instance();

      handleSubmit(true);

      expect(props.addAttributeToExistingGroup).toHaveBeenCalledWith(
        'tests',
        search
      );

      expect(props.history.push).toHaveBeenCalledWith({
        search: 'modalType=chooseAttributes',
      });
    });
  });

  describe('HandleSubmitEdit', () => {
    it('should call saveEditedAttributeGroup with right params', () => {
      const attrIndex = '0';
      props.location.search = `attributeName=${attrIndex}`;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const { handleSubmitEdit } = wrapper.instance();

      handleSubmitEdit();

      expect(props.saveEditedAttributeGroup).toHaveBeenCalledWith(
        attrIndex,
        false,
        'tests'
      );
    });

    it('should redirect to choose attribute modal if shouldContinue is true', () => {
      const attrIndex = '0';
      props.location.search = `attributeName=${attrIndex}`;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const { handleSubmitEdit } = wrapper.instance();

      handleSubmitEdit(true);

      expect(props.history.push).toHaveBeenCalledWith({
        search: 'modalType=chooseAttributes',
      });
    });
  });

  describe('OpenEditFeatureModal', () => {
    it('should display a notification if thee modal cannot be opened', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = false;
      props.canOpenModal = false;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const spyOnDisplayNotification = jest.spyOn(
        wrapper.instance(),
        'displayNotificationCTNotSaved'
      );
      const { openEditFeatureModal } = wrapper.instance();
      openEditFeatureModal();

      expect(spyOnDisplayNotification).toHaveBeenCalled();
    });

    it('should redirect to the right url if isTemporary is true', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = true;
      props.canOpenModal = true;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);

      const { openEditFeatureModal } = wrapper.instance();
      openEditFeatureModal();

      expect(props.history.push).toHaveBeenCalledWith({
        search:
          'modalType=group&settingType=base&actionType=edit&groupName=tests',
      });
    });

    it('should emit event if edit modal can be opened', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = true;
      props.canOpenModal = true;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);

      const { openEditFeatureModal } = wrapper.instance();
      openEditFeatureModal();

      expect(context.emitEvent).toHaveBeenCalledWith('willEditNameOfGroup');
    });
  });

  describe('PluginHeaderActions', () => {
    it('should call submitTempGroup with newGroup param when isTemporary is true', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = true;
      props.newGroup.name = 'tests';

      props.newGroup.schema.attributes = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
      ];

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const { pluginHeaderActions } = wrapper.find(ViewContainer).props();

      pluginHeaderActions[1].onClick();

      expect(props.submitTempGroup).toHaveBeenCalledWith(
        props.newGroup,
        context
      );
    });

    it('should call submitGroup with modifiedDataGroup param when isTemporary is false', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = false;

      props.initialDataGroup.tests.schema.attributes = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
        {
          name: 'quantity',
          type: 'float',
          required: true,
        },
      ];
      props.modifiedDataGroup.tests.schema.attributes = [
        {
          name: 'firstname',
          type: 'string',
          required: true,
        },
        {
          name: 'quantity',
          type: 'float',
          required: true,
        },
      ];

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const { pluginHeaderActions } = wrapper.find(ViewContainer).props();

      pluginHeaderActions[1].onClick();

      expect(props.submitGroup).toHaveBeenCalled();
    });
  });

  describe('ListHeader button', () => {
    it('should call openAttributesModal on list header button click', () => {
      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const spyOnClick = jest.spyOn(wrapper.instance(), 'openAttributesModal');
      wrapper.instance().forceUpdate();

      expect(wrapper.find(ListHeader)).toHaveLength(1);

      const button = wrapper.find(ListHeader).prop('button');
      button.onClick();

      expect(spyOnClick).toHaveBeenCalled();
    });
  });

  describe('DeleteGroupAttribute', () => {
    it('should display a notification if thee modal cannot be opened', async () => {
      props.groups.find(item => item.name == 'tests').isTemporary = false;
      props.canOpenModal = false;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const spyOnDisplayNotification = jest.spyOn(
        wrapper.instance(),
        'displayNotificationCTNotSaved'
      );
      const { handleClickOnTrashIcon } = wrapper.instance();
      handleClickOnTrashIcon(0);
      expect(context.emitEvent).not.toHaveBeenCalledWith(
        'willDeleteFieldOfGroup'
      );
      expect(spyOnDisplayNotification).toHaveBeenCalled();
    });
    it('should call deleteGroupAttribute with modifiedDataGroup path when isTemporary is false', () => {
      props.groups.find(item => item.name == 'tests').isTemporary = false;
      props.canOpenModal = true;
      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const {
        handleClickOnTrashIcon,
        handleDeleteAttribute,
      } = wrapper.instance();
      handleClickOnTrashIcon(0);
      expect(wrapper.state()).toEqual({
        attrToDelete: 0,
        showWarning: true,
      });
      handleDeleteAttribute();
      const keys = ['modifiedDataGroup', 'tests', 'schema', 'attributes', 0];
      expect(props.deleteGroupAttribute).toHaveBeenCalledWith(keys);
      expect(context.emitEvent).toHaveBeenCalledWith('willDeleteFieldOfGroup');
    });

    it('should call deleteGroupAttribute with newGroup path when isTemporary is true', () => {
      props.groups[0].isTemporary = true;
      props.newGroup.name = 'tests';
      props.canOpenModal = true;

      topCompo = renderComponent(props);
      const wrapper = topCompo.find(GroupPage);
      const {
        handleClickOnTrashIcon,
        handleDeleteAttribute,
      } = wrapper.instance();
      handleClickOnTrashIcon(0);
      handleDeleteAttribute();

      const keys = ['newGroup', 'schema', 'attributes', 0];
      expect(props.deleteGroupAttribute).toHaveBeenCalledWith(keys);
      expect(context.emitEvent).toHaveBeenCalledWith('willDeleteFieldOfGroup');
    });
  });
});
