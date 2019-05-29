import React from 'react';
import { shallow } from 'enzyme';

import Ul from '../index';

describe('<Ul />', () => {
  it('should not crash', () => {
    shallow(<Ul />);
  });

  it('should render its children', () => {
    const Child = () => <div>I'm a child</div>;
    const wrapper = shallow(<Ul><Child /></Ul>);

    expect(wrapper.find(Child).exists()).toBe(true);
  });

  it('should adopt an id', () => {
    const wrapper = shallow(<Ul id="test" />);

    expect(wrapper.prop('id')).toBe('test');
  });
});
