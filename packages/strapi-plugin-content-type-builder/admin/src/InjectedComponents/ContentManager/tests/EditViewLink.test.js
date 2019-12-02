import React from 'react';
import { shallow } from 'enzyme';

import { LiLink } from 'strapi-helper-plugin';
import EditViewLink from '../EditViewLink';

describe('<EditViewLink />', () => {
  let props;

  beforeEach(() => {
    props = {
      currentEnvironment: 'development',
      getContentTypeBuilderBaseUrl: jest.fn(() => '/plugins/'),
      getModelName: jest.fn(() => 'test'),
      getSource: jest.fn(),
    };
  });

  it('should not crash', () => {
    shallow(<EditViewLink {...props} />);
  });

  it('should return null if the currentEnvironment is different than development', () => {
    const wrapper = shallow(
      <EditViewLink {...props} currentEnvironment="test" />
    );
    const liLink = wrapper.find(LiLink);

    expect(liLink).toHaveLength(0);
  });
});
