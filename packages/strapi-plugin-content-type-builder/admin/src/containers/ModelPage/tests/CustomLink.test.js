import React from 'react';
import { shallow } from 'enzyme';

import CustomLink from '../CustomLink';

describe('<CustomLink />', () => {
  it('should not crash', () => {
    const onClick = jest.fn();

    shallow(<CustomLink onClick={onClick} />);
  });

  it('should call the onClick prop if needed', () => {
    const onClick = jest.fn();
    const wrapper = shallow(<CustomLink onClick={onClick} />);
    const div = wrapper.find('div').first();

    div.simulate('click');

    expect(onClick).toHaveBeenCalled();
  });
});
