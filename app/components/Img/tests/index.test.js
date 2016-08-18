import Img from '../index';

import { expect } from 'chai';
import { shallow } from 'enzyme';
import React from 'react';

describe('<Img />', () => {
  it('should render an <img> tag', () => {
    const renderedComponent = shallow(<Img src="test.png" alt="test" />);
    expect(renderedComponent).to.have.tagName('img');
  });

  it('should have an alt attribute', () => {
    const renderedComponent = shallow(<Img src="test.png" alt="test" />);
    expect(renderedComponent).to.have.attr('alt', 'test');
  });
});
