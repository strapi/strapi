import React from 'react';
import { shallow } from 'enzyme';

import FooterModal from '../index';

describe('<FooterModal />', () => {
  it('should not crash', () => {
    shallow(<FooterModal />);
  });

  it('should render its children', () => {
    const Child = () => <div>This is a child</div>;
    const wrapper = shallow(<FooterModal><Child /></FooterModal>);

    expect(wrapper.find(Child).exists()).toBe(true);
  });
});
