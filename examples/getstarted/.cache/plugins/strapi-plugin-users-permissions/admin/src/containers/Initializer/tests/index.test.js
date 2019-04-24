import React from 'react';
import { mount, shallow } from 'enzyme';

import { Initializer, mapDispatchToProps } from '../index';
import { initialize } from '../actions';

describe('<Initializer />', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      initialize: jest.fn(),
      shouldUpdate: false,
      unsetAppSecured: jest.fn(),
      updatePlugin: jest.fn(),
    };
  });

  it('Should not crash', () => {
    shallow(<Initializer {...defaultProps} />);
  });

  it('should call the initialize prop on mount', () => {
    mount(<Initializer {...defaultProps} />);

    expect(defaultProps.initialize).toHaveBeenCalled();
  });

  it('should call the unsetAppSecured prop on mount', () => {
    mount(<Initializer {...defaultProps} />);

    expect(defaultProps.unsetAppSecured).toHaveBeenCalled();
  });

  it('should call the updatePlugin prop when the shouldUpdate prop has changed', () => {
    const renderedComponent = mount(<Initializer {...defaultProps} />);

    renderedComponent.setProps({ shouldUpdate: true });

    expect(renderedComponent.instance().props.updatePlugin).toHaveBeenCalledWith(
      'users-permissions',
      'isReady',
      true,
    );
  });

  it('should not call the updatePlugin prop when the shouldUpdate prop has changed', () => {
    const renderedComponent = mount(<Initializer {...defaultProps} />);

    renderedComponent.setProps({ shouldUpdate: false });

    expect(renderedComponent.instance().props.updatePlugin).not.toHaveBeenCalled();
  });
});

describe('<Initializer />, mapDispatchToProps', () => {
  describe('initialize', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.initialize).toBeDefined();
    });

    it('should dispatch the initialize action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.initialize();

      expect(dispatch).toHaveBeenCalledWith(initialize());
    });
  });
});
