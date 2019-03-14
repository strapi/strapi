import React from 'react';
import { shallow } from 'enzyme';

import pluginId from '../../../pluginId';

import EmptyContentTypeView from '../../../components/EmptyContentTypeView';
import TableList from '../../../components/TableList';

import HomePage from '../index';

describe('CTB <HomePage />', () => {
  let props;

  beforeEach(() => {
    props = {
      cancelNewContentType: jest.fn(),
      canOpenModalAddContentType: true,
      createTempContentType: jest.fn(),
      deleteModel: jest.fn(),
      models: [
        { icon: 'fa-cube', name: 'permission', description: '', fields: 6, source: 'users-permissions', isTemporary: false },
        { icon: 'fa-cube', name: 'user', description: '', fields: 6, source: 'users-permissions', isTemporary: false },
        { icon: 'fa-cube', name: 'role', description: '', fields: 6, source: 'users-permissions', isTemporary: false },
        { icon: 'fa-cube', name: 'product', description: 'super api', fields: 6, isTemporary: false },
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
      onChangeNewContentType: jest.fn(),
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
    shallow(<HomePage {...props} />);
  });

  describe('render', () => {
    it('should display the EmptyContentTypeView if there is no model in the application', () => {
      props.models = [];

      const wrapper = shallow(<HomePage {...props} />);
      const emptyView = wrapper.find(EmptyContentTypeView);

      expect(emptyView).toHaveLength(1);
    });

    it('the tableList should have a plural title if there is more than 1 model', () => {
      const wrapper = shallow(<HomePage {...props} />);
      const table = wrapper.find(TableList);

      expect(table).toHaveLength(1);
      expect(table.prop('title')).toEqual(`${pluginId}.table.contentType.title.plural`);
    });

    it('the tableList should have a singular title if there is more less 2 model', () => {
      props.models = [{ icon: 'fa-cube', name: 'permission', description: '', fields: 6, source: 'users-permissions', isTemporary: false }];

      const wrapper = shallow(<HomePage {...props} />);
      const table = wrapper.find(TableList);

      expect(table).toHaveLength(1);
      expect(table.prop('title')).toEqual(`${pluginId}.table.contentType.title.singular`);
    });
  });

  describe('instances', () => {
    describe('getActionType', () => {
      it('should return the correct search param', () => {
        props.location.search = 'modalType=model&settingType=base&actionType=create';
        const wrapper = shallow(<HomePage {...props} />);
        const { getActionType } = wrapper.instance();

        expect(getActionType()).toEqual('create');
      });
    });

    describe('getFormData', () => {
      it('should return the newContentType prop if the search contains create', () => {
        props.location.search = 'modalType=model&settingType=base&actionType=create';

        const wrapper = shallow(<HomePage {...props} />);
        const { getFormData } = wrapper.instance();

        expect(getFormData()).toEqual(props.newContentType);
      });

      // This test needs to be updated when doing the edition
      // it('should return null otherwise', () => {
      //   const wrapper = shallow(<HomePage {...props} />);
      //   const { getFormData } = wrapper.instance();

      //   expect(getFormData()).toBeNull();
      // });
    });

    describe('handleClick', () => {
      it('should change the search if there is no temporary model', () => {
        props.canOpenModalAddContentType = true;

        const wrapper = shallow(<HomePage {...props} />);
        const { handleClick } = wrapper.instance();

        handleClick();

        expect(strapi.notification.info).not.toHaveBeenCalled();
        expect(props.history.push).toHaveBeenCalledWith({ search: 'modalType=model&settingType=base&actionType=create' });
      });

      it('should display a notification if there is a temporary model', () => {
        props.canOpenModalAddContentType = false;

        const wrapper = shallow(<HomePage {...props} />);
        const { handleClick } = wrapper.instance();
        handleClick();

        expect(strapi.notification.info).toHaveBeenCalled();

        wrapper.unmount();
      });
    });
  });
});
