import React from 'react';
import { shallow } from 'enzyme';

import NavLink from 'components/NavLink';
import EditViewLink from '../EditViewLink';

describe('<EditViewLink />', () => {
  let props;

  beforeEach(() => {
    props = {
      getContentTypeBuilderBaseUrl: jest.fn(() => '/plugins/'),
      getModelName: jest.fn(() => 'test'),
      getSource: jest.fn(),
    };
  });

  it('should not crash', () => {
    shallow(<EditViewLink {...props} />);
  });

  it('should handle the source correctly if it is undefined', () => {
    const wrapper = shallow(<EditViewLink {...props} />);
    const navLink = wrapper.find(NavLink);

    expect(navLink.prop('url')).toBe('/plugins/test');
  });

  it('should handle the source correctly if it is not undefined', () => {
    props.getSource = jest.fn(() => 'users-permissions');
    const wrapper = shallow(<EditViewLink {...props} />);
    const navLink = wrapper.find(NavLink);

    expect(navLink.prop('url')).toBe('/plugins/test&source=users-permissions');
  });
});
