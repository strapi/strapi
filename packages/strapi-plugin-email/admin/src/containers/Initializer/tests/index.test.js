import React from 'react';
import { mount, shallow } from 'enzyme';

import Initializer from '../index';

describe('<Initializer />', () => {
  it('Should not crash', () => {
    const updatePlugin = jest.fn();
    shallow(<Initializer updatePlugin={updatePlugin} />);
  });

  it('should call the updatePlugin props when mounted', () => {
    const updatePlugin = jest.fn();

    const wrapper = mount(<Initializer updatePlugin={updatePlugin} />);

    expect(wrapper.prop('updatePlugin')).toHaveBeenCalledWith('email', 'isReady', true);
  });
});
