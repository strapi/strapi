import IssueIcon from '../index';

import expect from 'expect';
import { shallow } from 'enzyme';
import React from 'react';

describe('<IssueIcon />', () => {
  it('should render a SVG', () => {
    const renderedComponent = shallow(
      <IssueIcon />
    );
    expect(renderedComponent.find('svg').length).toEqual(1);
  });
});
