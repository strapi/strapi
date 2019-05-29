import React from 'react';
import { shallow } from 'enzyme';

import BodyModal from '../index';

describe('<BodyModal />', () => {
  it('should not crash', () => {
    shallow(<BodyModal />);
  });

  it('should render its children', () => {
    const Child = () => <div>This is a child</div>;
    const wrapper = shallow(<BodyModal><Child /></BodyModal>);

    expect(wrapper.find(Child).exists()).toBe(true);
  });
});
