import React from 'react';
import { shallow } from 'enzyme';

import InlineBlock from '../InlineBlock';

describe('<InlineBlock />', () => {
  it('should not crash', () => {
    shallow(<InlineBlock />);
  });

  it('should render his children', () => {
    const Child = () => <div>I'm a child</div>;
    const wrapper = shallow(
      <InlineBlock>
        <Child />
      </InlineBlock>,
    );

    expect(wrapper.find(Child).exists()).toBe(true);
  });
});
