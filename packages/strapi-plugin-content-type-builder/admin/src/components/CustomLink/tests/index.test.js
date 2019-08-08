import React from 'react';
import { shallow } from 'enzyme';

import { CustomLink } from '../index';

describe('<CustomLink />', () => {
  it('should not crash', () => {
    const onClick = jest.fn();

    shallow(<CustomLink onClick={onClick} />);
  });

  it('should call the onClick prop if needed', () => {
    const onClick = jest.fn();
    const wrapper = shallow(<CustomLink onClick={onClick} />);
    const button = wrapper.find('button');

    button.simulate('click');

    expect(onClick).toHaveBeenCalled();
  });
});
