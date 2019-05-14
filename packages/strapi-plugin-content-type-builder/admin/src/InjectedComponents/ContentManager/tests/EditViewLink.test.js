import React from 'react';
import { shallow } from 'enzyme';

import { LiLink } from 'strapi-helper-plugin';
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
    const liLink = wrapper.find(LiLink);

    expect(liLink.prop('url')).toBe('/plugins/test');
  });

  it('should handle the source correctly if it is not undefined', () => {
    props.getSource = jest.fn(() => 'users-permissions');
    const wrapper = shallow(<EditViewLink {...props} />);
    const liLink = wrapper.find(LiLink);

    expect(liLink.prop('url')).toBe('/plugins/test&source=users-permissions');
  });
});
