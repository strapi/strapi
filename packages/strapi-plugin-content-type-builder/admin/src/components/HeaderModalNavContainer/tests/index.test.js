import React from 'react';
import { shallow } from 'enzyme';

import HeaderModalNavContainer from '../index';

describe('<HeaderModalNavContainer />', () => {
  it('should not crash', () => {
    shallow(<HeaderModalNavContainer />);
  });

  it('should render its children', () => {
    const Child = () => <div>Some child</div>;
    const wrapper = shallow(<HeaderModalNavContainer><Child /></HeaderModalNavContainer>);

    expect(wrapper.find(Child).exists()).toBe(true);
  });
});
