import React from 'react';
import { shallow } from 'enzyme';

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
});
