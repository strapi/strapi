import React from 'react';
import { shallow } from 'enzyme';

import RelationWrapper from '../RelationWrapper';

describe('<RelationWrapper />', () => {
  it('should not crash', () => {
    shallow(<RelationWrapper />);
  });

  it('should render its children', () => {
    const Child = () => 'something';

    const wrapper = shallow(
      <RelationWrapper>
        <Child />
      </RelationWrapper>,
    );

    expect(wrapper.find(Child)).toHaveLength(1);
  });
});
