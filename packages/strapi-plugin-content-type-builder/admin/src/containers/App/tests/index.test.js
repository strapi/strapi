import React from 'react';
import { shallow } from 'enzyme';

import { App, mapDispatchToProps } from '../index';
import { getData } from '../actions';

import Loader from '../Loader';

describe('<App />', () => {
  let props;

  beforeEach(() => {
    props = {
      cancelNewContentType: jest.fn(),
      deleteModel: jest.fn(),
      getData: jest.fn(),
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
        { icon: 'fa-cube', name: 'product', description: 'super api', fields: 6, isTemporary: false },
      ],
      modifiedData: {},
      onChangeExistingContentTypeMainInfos: jest.fn(),
      onChangeNewContentTypeMainInfos: jest.fn(),
      saveEditedAttribute: jest.fn(),
      resetProps: jest.fn(),
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

  describe('<App />, instances', () => {
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
