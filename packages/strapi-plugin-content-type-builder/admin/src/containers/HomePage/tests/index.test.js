import React from 'react';
import { shallow } from 'enzyme';

import pluginId from '../../../pluginId';

import EmptyContentTypeView from '../../../components/EmptyContentTypeView';
import TableList from '../../../components/TableList';
import ModelForm from '../../ModelForm';

import HomePage from '../index';

describe('CTB <HomePage />', () => {
  let props;

  beforeEach(() => {
    props = {
      cancelNewContentType: jest.fn(),
      canOpenModal: true,
      createTempContentType: jest.fn(),
      deleteModel: jest.fn(),
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
        pathname: `/plugins/${pluginId}`,
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

    it('the tableList should have a plural title if there is more than 1 model', () => {
      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const table = wrapper.find(TableList);

      expect(table).toHaveLength(1);
      expect(table.prop('title')).toEqual(`${pluginId}.table.contentType.title.plural`);
    });

    it('the tableList should have a singular title if there is more less 2 model', () => {
      props.models = [
        {
          icon: 'fa-cube',
          name: 'permission',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
      ];

      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const table = wrapper.find(TableList);

      expect(table).toHaveLength(1);
      expect(table.prop('title')).toEqual(`${pluginId}.table.contentType.title.singular`);
    });
  });

  describe('workflow', () => {
    it('should open the modelForm if there is no saved content type', () => {
      props.canOpenModal = true;
      props.history.push = jest.fn(({ search }) => {
        props.location.search = `?${search}`;
      });
      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });
      const spyOnClick = jest.spyOn(wrapper.instance(), 'handleClick');

      wrapper.instance().forceUpdate();
      // Simulate the click on button
      wrapper.find(TableList).prop('onButtonClick')();
      wrapper.instance().forceUpdate();

      const form = wrapper.find(ModelForm).first();

      expect(spyOnClick).toHaveBeenCalled();
      expect(context.emitEvent).toHaveBeenCalledWith('willCreateContentType');
      expect(props.history.push).toHaveBeenCalledWith({
        search: 'modalType=model&settingType=base&actionType=create',
      });
      expect(form.prop('isOpen')).toBe(true);
    });

    it('should not open the modal if the is one or more not saved content type and display a notification', () => {
      props.canOpenModal = false;
      const context = { emitEvent: jest.fn() };
      const wrapper = shallow(<HomePage {...props} />, { context });

      wrapper.find(TableList).prop('onButtonClick')();
      wrapper.instance().forceUpdate();

      const form = wrapper.find(ModelForm).first();

      expect(context.emitEvent).not.toHaveBeenCalled();
      expect(props.history.push).not.toHaveBeenCalled();
      expect(strapi.notification.info).toHaveBeenCalled();
      expect(strapi.notification.info).toHaveBeenCalledWith(
        `${pluginId}.notification.info.contentType.creating.notSaved`,
      );
      expect(form.prop('isOpen')).toBe(false);
    });
  });
});
