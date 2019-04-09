import React from 'react';
import { shallow } from 'enzyme';

import HeaderModal from '../index';

describe('<HeaderModal />', () => {
  it('should not crash', () => {
    shallow(<HeaderModal />);
  });

  it('should render its children', () => {
    const Child = () => <div>Some child</div>;
    const wrapper = shallow(<HeaderModal><Child /></HeaderModal>);

    expect(wrapper.find(Child).exists()).toBe(true);
  });
});
