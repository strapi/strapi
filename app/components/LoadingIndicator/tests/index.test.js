import LoadingIndicator from '../index';

import expect from 'expect';
import { shallow } from 'enzyme';
import React from 'react';

describe('<LoadingIndicator />', () => {
  it('should render 14 divs', () => {
    const renderedComponent = shallow(
      <LoadingIndicator />
    );
    expect(renderedComponent.find('div').length).toEqual(14);
  });
});
