import React from 'react';
import { shallow } from 'enzyme';

import ListTitle from '../index';

describe('<ListTitle />', () => {
  it('should not crash', () => {
    shallow(<ListTitle />);
  });

  it('should render his children', () => {
    const Child = () => <div>I'm a child</div>;
    const wrapper = shallow(<ListTitle><Child /></ListTitle>);

    expect(wrapper.find(Child).exists()).toBe(true);
  });
});
