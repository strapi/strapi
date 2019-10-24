import React from 'react';
import { shallow } from 'enzyme';

import { LeftMenuLink } from '../index';

const props = {
  to: '/',
};

describe('<LeftMenuLink />', () => {
  it('should not crash', () => {
    shallow(<LeftMenuLink {...props} />);
  });

  it('should render a node children if it exists', () => {
    const renderedComponent = shallow(
      <LeftMenuLink {...props}>
        <span>test</span>
      </LeftMenuLink>
    );

    const children = renderedComponent.find('span');

    expect(children.exists()).toBe(true);
  });
});
