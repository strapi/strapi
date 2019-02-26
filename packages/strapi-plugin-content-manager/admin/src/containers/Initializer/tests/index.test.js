import React from 'react';
import { mount, shallow } from 'enzyme';

import { Initializer } from '../index';

describe('<Initializer />', () => {
  it('Should not crash', () => {
    const updatePlugin = jest.fn();
    const initialize = jest.fn();
    const renderedComponent = shallow(<Initializer updatePlugin={updatePlugin} initialize={initialize} />);

    expect(renderedComponent.children()).toHaveLength(0);
  });

  it('should call the initialize props when mounted', () => {
    const initialize = jest.fn();

    const wrapper = mount(<Initializer initialize={initialize} />);

    expect(wrapper.prop('initialize')).toHaveBeenCalled();
  });
});
