import React from 'react';
import { shallow } from 'enzyme';

import ErrorBoundary from '../index';

describe('<ErrorBoundary />', () => {
  it('should not crash', () => {
    shallow(<ErrorBoundary />);
  });

  it('should render its child', () => {
    const Child = () => <div>test</div>;

    const wrapper = shallow(
      <ErrorBoundary>
        <Child />
      </ErrorBoundary>,
    );

    expect(wrapper.find(Child)).toHaveLength(1);
  });
});
