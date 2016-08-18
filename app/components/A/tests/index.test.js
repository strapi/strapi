/**
 * Testing our link component
 */

import A from '../index';

import expect from 'expect';
import { shallow } from 'enzyme';
import React from 'react';

describe('<A />', () => {
  it('should render its children', () => {
    const children = (<h1>Test</h1>);
    const renderedComponent = shallow(
      <A>
        {children}
      </A>
    );
    expect(renderedComponent.contains(children)).toEqual(true);
  });

  it('should adopt the className', () => {
    const renderedComponent = shallow(<A className="test" />);
    expect(renderedComponent.find('a').hasClass('test')).toEqual(true);
  });

  it('should adopt the href', () => {
    const renderedComponent = shallow(<A href="mxstbr.com" />);
    expect(renderedComponent.prop('href')).toEqual('mxstbr.com');
  });

  it('should adopt the target', () => {
    const renderedComponent = shallow(<A target="_blank" />);
    expect(renderedComponent.prop('target')).toEqual('_blank');
  });
});
