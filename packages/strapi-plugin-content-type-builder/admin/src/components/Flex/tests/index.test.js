import React from 'react';
import { shallow } from 'enzyme';

import Flex from '../index';

describe('<Flex />', () => {
  it('should not crash', () => {
    shallow(<Flex />);
  });

  it('should render his children', () => {
    const Child = () => <div>I'm a child</div>;
    const wrapper = shallow(<Flex><Child /></Flex>);

    expect(wrapper.find(Child).exists()).toBe(true);
  });
});
