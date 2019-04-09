import React from 'react';
import { shallow } from 'enzyme';

import LeftMenuSection from '../index';

describe('<LeftMenuSection />', () => {
  it('should not crash', () => {
    shallow(<LeftMenuSection />);
  });

  it('should render a child if given', () => {
    const Child = () => <div>I'm a child</div>;
    const wrapper = shallow(<LeftMenuSection><Child /></LeftMenuSection>);

    expect(wrapper.find(Child).exists()).toBe(true);
  });
});
