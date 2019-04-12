import React from 'react';
import { shallow } from 'enzyme';

import LeftMenu from '../index';

describe('<LeftMenu />', () => {
  it('should not crash', () => {
    shallow(<LeftMenu />);
  });

  it('should render a child if given', () => {
    const Child = () => <div>I'm a child</div>;
    const wrapper = shallow(<LeftMenu><Child /></LeftMenu>);

    expect(wrapper.find(Child).exists()).toBe(true);
  });
});
