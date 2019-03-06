import React from 'react';
import { shallow } from 'enzyme';
import { App, mapDispatchToProps } from '../index';
import { getData } from '../actions';

describe('<App />', () => {
  let props;

  beforeEach(() => {
    props = {
      getData: jest.fn(),
      initialData: {},
      models: [],
      modifiedData: {},
    };
  });

  it('should not crash', () => {
    shallow(<App {...props} />);
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
