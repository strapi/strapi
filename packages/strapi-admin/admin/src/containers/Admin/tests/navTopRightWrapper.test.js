import React from 'react';
import { shallow } from 'enzyme';

import NavTopRightWrapper from '../NavTopRightWrapper';

describe('<NavTopRightWrapper />', () => {
  it('should not crash', () => {
    shallow(<NavTopRightWrapper />);
  });

  it('should render some child if given', () => {
    const Child = () => <div>Child</div>;
    const renderedComponent = shallow(
      <NavTopRightWrapper>
        <Child />
      </NavTopRightWrapper>,
    );

    expect(renderedComponent.find(Child).exists()).toBe(true);
  });
});
