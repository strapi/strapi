import React from 'react';
import { shallow } from 'enzyme';

import App from '../index';

describe('<App />', () => {
  let props;

  beforeEach(() => {
    props = {
      history: {
        push: jest.fn(),
      },
      location: {
        pathname: '/plugins/users-permissions',
      },
    };
  });

  it('should not crash', () => {
    shallow(<App {...props} />);
  });
});
