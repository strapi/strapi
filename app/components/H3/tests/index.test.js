import H3 from '../index';

import expect from 'expect';
import { shallow } from 'enzyme';
import React from 'react';

describe('<H3 />', () => {
  it('should render its text', () => {
    const children = 'Text';
    const renderedComponent = shallow(
      <H3>{children}</H3>
    );
    expect(renderedComponent.contains(children)).toEqual(true);
  });
});
