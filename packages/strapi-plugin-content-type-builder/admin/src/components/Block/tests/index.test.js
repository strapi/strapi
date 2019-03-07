import React from 'react';
import { shallow } from 'enzyme';

import Block from '../index';

describe('<Block />', () => {
  it('should not crash', () => {
    shallow(<Block />);
  });

  it('should render his children', () => {
    const Child = () => <div>I'm a child</div>;
    const wrapper = shallow(<Block><Child /></Block>);

    expect(wrapper.find(Child).exists()).toBe(true);
  });
});
