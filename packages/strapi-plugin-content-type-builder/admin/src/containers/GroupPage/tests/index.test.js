import React from 'react';
import { shallow, mount } from 'enzyme';
import { BrowserRouter } from 'react-router-dom';
import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import GroupPage from '../index';
import MenuContext from '../../MenuContext';

const basePath = '/plugins/content-type-builder/groups';
const props = {
  groups: [
    {
      icon: 'fa-cube',
      name: 'tests',
      description: '',
      fields: 2,
      source: 'users-permissions',
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
    description: '',
    name: '',
    attributes: [],
  },
};

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

describe('CTB <GroupPage />', () => {
  it('should not crash', () => {
    shallow(<GroupPage {...props} />);
  });

  describe('GetFeature', () => {
    it('should return the correct feature', () => {
      const { getFeature } = shallow(<GroupPage {...props} />).instance();

      expect(getFeature()).toEqual(props.initialDataGroup.tests);
    });
  });

  describe('GetFeatureHeaderDescription', () => {
    it("should return the model's description field", () => {
      const { getFeatureHeaderDescription } = shallow(
        <GroupPage {...props} />
      ).instance();

      expect(getFeatureHeaderDescription()).toEqual('tests description');
    });
  });

  describe('getFeatureName', () => {
    it("should return the model's name field", () => {
      const { getFeatureName } = shallow(<GroupPage {...props} />).instance();

      expect(getFeatureName()).toEqual('tests');
    });
  });

  describe('User interactions', () => {
    let topCompo;
    afterEach(() => {
      topCompo.unmount();
    });
    const wait = async () => new Promise(resolve => setTimeout(resolve, 100));

    describe('HandleClickIcon', () => {
      it('should display a notification if thee modal cannot be opened', async () => {
        props.canOpenModal = false;

        topCompo = renderComponent(props);
        const wrapper = topCompo.find(GroupPage);

        const spyOnWait = jest.spyOn(wrapper.instance(), 'wait');
        const spyOnDisplayNotification = jest.spyOn(
          wrapper.instance(),
          'displayNotificationCTNotSaved'
        );
        const { handleClickIcon } = wrapper.instance();

        handleClickIcon();

        expect(spyOnWait).toHaveBeenCalled();

        await wait();

        expect(context.emitEvent).not.toHaveBeenCalledWith(
          'willEditNameOfGroup'
        );
        expect(props.history.push).not.toHaveBeenCalled();
        expect(spyOnDisplayNotification).toHaveBeenCalled();
      });

      it('should emit the event editFieldOfGroup', async () => {
        props.canOpenModal = true;
        topCompo = renderComponent(props);
        const wrapper = topCompo.find(GroupPage);

        const spyOnWait = jest.spyOn(wrapper.instance(), 'wait');
        const { handleClickIcon } = wrapper.instance();

        handleClickIcon();

        expect(spyOnWait).toHaveBeenCalled();

        await wait();

        expect(context.emitEvent).toHaveBeenCalledWith('willEditNameOfGroup');
        expect(props.history.push).toHaveBeenCalledWith({
          search:
            'modalType=group&settingType=base&actionType=edit&modelName=tests',
        });
      });
    });
  });
});
