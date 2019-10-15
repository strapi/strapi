import React from 'react';
import { shallow } from 'enzyme';

import { App, mapDispatchToProps } from '../index';
import { getData } from '../actions';

import Loader from '../Loader';

describe('<App />', () => {
  let props;

  beforeEach(() => {
    props = {
      addAttributeRelation: jest.fn(),
      cancelNewContentType: jest.fn(),
      connections: [],
      createTempContentType: jest.fn(),
      createTempGroup: jest.fn(),
      deleteModel: jest.fn(),
      history: {
        push: jest.fn(),
      },
      location: {
        pathname: '',
        search: '',
      },
      getData: jest.fn(),
      groups: [
        {
          uid: 'ingredients',
          name: 'Ingredients',
          source: null,
          description: 'Little description',
          fields: 0,
          isTemporary: false,
        },
        {
          uid: 'fruits',
          name: 'Fruits',
          source: null,
          description: 'Little description',
          fields: 0,
          isTemporary: false,
        },
      ],
      initialData: {},
      isLoading: true,
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
      modifiedDataGroup: {},
      newContentType: {},
      newGroup: {},
      onChangeExistingContentTypeMainInfos: jest.fn(),
      onChangeExistingGroupMainInfos: jest.fn(),
      onChangeNewContentTypeMainInfos: jest.fn(),
      onChangeNewGroupMainInfos: jest.fn(),
      saveEditedAttribute: jest.fn(),
      saveEditedAttributeRelation: jest.fn(),
      setTemporaryAttribute: jest.fn(),
      setTemporaryAttributeRelation: jest.fn(),
      resetProps: jest.fn(),
      resetExistingContentTypeMainInfos: jest.fn(),
      resetExistingGroupMainInfos: jest.fn(),
      resetNewContentTypeMainInfos: jest.fn(),
      updateTempContentType: jest.fn(),
      updateTempGroup: jest.fn(),
    };
  });

  it('should not crash', () => {
    shallow(<App {...props} />);
  });

  it('should render the Loader if the prop isLoading is true', () => {
    const wrapper = shallow(<App {...props} />);

    expect(wrapper.find(Loader)).toHaveLength(1);
  });

  it('should not render the Loader if isLoading is false', () => {
    props.isLoading = false;
    const wrapper = shallow(<App {...props} />);

    expect(wrapper.find(Loader)).toHaveLength(0);
  });

  it('should call the resetProps when the component unmounts', () => {
    const wrapper = shallow(<App {...props} />);

    wrapper.unmount();

    expect(props.resetProps).toHaveBeenCalled();
  });

  describe('<App />, instances', () => {
    describe('CanOpenModal', () => {
      it('should return true if all models and groups have isTemporary to false', () => {
        const wrapper = shallow(<App {...props} />);
        const { canOpenModal } = wrapper.instance();

        expect(canOpenModal()).toBeTruthy();
      });

      it('should return false if at least model has isTemporary set to true', () => {
        props.models.push({
          icon: 'fa-cube',
          name: 'test',
          description: 'super api',
          fields: 6,
          isTemporary: true,
        });
        const wrapper = shallow(<App {...props} />);
        const { canOpenModal } = wrapper.instance();

        expect(canOpenModal()).toBeFalsy();
      });

      it('should return false if at least group has isTemporary set to true', () => {
        props.groups.push({
          name: 'test',
          description: 'super group',
          fields: 6,
          isTemporary: true,
        });
        const wrapper = shallow(<App {...props} />);
        const { canOpenModal } = wrapper.instance();

        expect(canOpenModal()).toBeFalsy();
      });
    });

    describe('GetAllGroupsAndModelsNames', () => {
      it('Should return an array of all groups and models names', () => {
        const wrapper = shallow(<App {...props} />);
        const { getAllGroupsAndModelsNames } = wrapper.instance();

        const expected = [
          'permission',
          'user',
          'role',
          'product',
          'ingredients',
          'fruits',
        ];
        expect(getAllGroupsAndModelsNames()).toEqual(expected);
      });
    });

    describe('renderRoute', () => {
      it('should return a route', () => {
        const renderedComponent = shallow(<App {...props} />);
        const FakeComponent = () => <div />;
        const route = { to: '/content-type-builder', component: FakeComponent };
        const { renderRoute } = renderedComponent.instance();

        expect(renderRoute(route)).not.toBeNull();
      });
    });
  });
});

describe('CTB, <App />, mapDispatchToProps', () => {
  describe('getData', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.getData).toBeDefined();
    });

    it('should dispatch the getData action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      result.getData();

      expect(dispatch).toHaveBeenLastCalledWith(getData());
    });
  });
});
