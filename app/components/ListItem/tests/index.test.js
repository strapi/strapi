import ListItem from '../index';

import expect from 'expect';
import { shallow } from 'enzyme';
import React from 'react';

describe('<ListItem />', () => {
  it('should adopt the className', () => {
    const renderedComponent = shallow(<ListItem className="test" />);
    expect(renderedComponent.find('li').hasClass('test')).toEqual(true);
  });

  it('should render the content passed to it', () => {
    const content = 'Hello world!';
    const renderedComponent = shallow(
      <ListItem item={content} />
    );
    expect(renderedComponent.contains(content)).toEqual(true);
  });
});
