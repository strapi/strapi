import React from 'react';
import { shallow } from 'enzyme';

import pluginId from '../../../pluginId';
import { ListHeader } from 'strapi-helper-plugin';
import EmptyContentTypeView from '../../../components/EmptyContentTypeView';

import HomePage from '../index';

describe('CTB <HomePage />', () => {
  let props;

  beforeEach(() => {
    props = {
      cancelNewContentType: jest.fn(),
      canOpenModal: true,
      createTempContentType: jest.fn(),
      deleteModel: jest.fn(),
      deleteGroup: jest.fn(),
      deleteTemporaryModel: jest.fn(),
      deleteTemporaryGroup: jest.fn(),
      groups: [],
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
      ],
      match: { params: { type: 'models' } },
      modifiedData: {},
      newContentType: {
        collectionName: '',
        connection: 'default',
        description: '',
        mainField: '',
        name: '',
        attributes: {},
      },
      onChangeNewContentTypeMainInfos: jest.fn(),
      history: {
        push: jest.fn(),
      },
      location: {
        search: '',
        pathname: `/plugins/${pluginId}/models`,
      },
    };
  });

  it('should not crash', () => {
    const context = { emitEvent: jest.fn() };

    shallow(<HomePage {...props} />, { context });
  });

  describe('render', () => {
    it('should display the EmptyContentTypeView if there is no model in the application', () => {
      props.models = [];

      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const emptyView = wrapper.find(EmptyContentTypeView);

      expect(emptyView).toHaveLength(1);
    });

    it('should display the EmptyContentTypeView if there is no model in the application', () => {
      props.match.params.type = 'groups';

      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const emptyView = wrapper.find(EmptyContentTypeView);

      expect(emptyView).toHaveLength(1);
    });

    it('Should handle the listheader title correctly if there is more than 1 model', () => {
      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const list = wrapper.find(ListHeader);

      expect(list).toHaveLength(1);
      expect(list.prop('title')).toBe(
        `${pluginId}.table.contentType.title.plural`
      );
    });

    it('Should handle the listheader title correctly if there is more than 1 group', () => {
      props.groups = props.models;
      props.match.params.type = 'groups';
      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const list = wrapper.find(ListHeader);

      expect(list).toHaveLength(1);
      expect(list.prop('title')).toBe(`${pluginId}.table.groups.title.plural`);
    });

    it('Should handle the listheader title correctly if there is less than 2 groups', () => {
      props.groups = [
        {
          icon: 'fa-cube',
          name: 'user',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
      ];
      props.match.params.type = 'groups';
      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const list = wrapper.find(ListHeader);

      expect(list).toHaveLength(1);
      expect(list.prop('title')).toBe(
        `${pluginId}.table.groups.title.singular`
      );
    });

    it('Should handle the listheader title correctly if there is less than 2 models', () => {
      props.models = [
        {
          icon: 'fa-cube',
          name: 'user',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
      ];
      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const list = wrapper.find(ListHeader);

      expect(list).toHaveLength(1);
      expect(list.prop('title')).toBe(
        `${pluginId}.table.contentType.title.singular`
      );
    });
  });

  describe('workflow', () => {
    it('should open the modelForm for the model if there is no saved content type', () => {
      props.canOpenModal = true;
      props.history.push = jest.fn(({ search }) => {
        props.location.search = `?${search}`;
      });

      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const spyOnClick = jest.spyOn(wrapper.instance(), 'handleClick');

      wrapper.instance().forceUpdate();
      // Simulate the click on button
      wrapper
        .find(ListHeader)
        .prop('button')
        .onClick();
      wrapper.instance().forceUpdate();

      expect(spyOnClick).toHaveBeenCalled();
      expect(context.emitEvent).toHaveBeenCalledWith('willCreateContentType');
      expect(props.history.push).toHaveBeenCalledWith({
        search: 'modalType=model&settingType=base&actionType=create',
      });
    });

    it('should open the modelForm for groups if there is no is no saved content type', () => {
      props.canOpenModal = true;
      props.groups = [
        {
          icon: 'fa-cube',
          name: 'user',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
      ];
      props.location.pathname = `/plugins/${pluginId}/groups`;
      props.history.push = jest.fn(({ search }) => {
        props.location.search = `?${search}`;
      });
      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const spyOnClick = jest.spyOn(wrapper.instance(), 'handleClick');

      wrapper.instance().forceUpdate();
      // Simulate the click on button
      wrapper
        .find(ListHeader)
        .prop('button')
        .onClick();
      wrapper.instance().forceUpdate();

      expect(spyOnClick).toHaveBeenCalled();
      expect(context.emitEvent).toHaveBeenCalledWith('willCreateContentType');
      expect(props.history.push).toHaveBeenCalledWith({
        search: 'modalType=model&settingType=base&actionType=create',
      });
    });

    it('should not open the modal if there is one not saved content type and display a notification', () => {
      props.canOpenModal = false;
      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });

      wrapper
        .find(ListHeader)
        .prop('button')
        .onClick();
      wrapper.instance().forceUpdate();

      expect(context.emitEvent).not.toHaveBeenCalled();
      expect(props.history.push).not.toHaveBeenCalled();
      expect(strapi.notification.info).toHaveBeenCalled();
      expect(strapi.notification.info).toHaveBeenCalledWith(
        `${pluginId}.notification.info.work.notSaved`
      );
    });
  });
});
