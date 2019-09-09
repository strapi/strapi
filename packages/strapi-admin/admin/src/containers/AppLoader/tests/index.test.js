import React from 'react';
import { shallow } from 'enzyme';

import { AppLoader } from '../index';

describe('<AppLoader />', () => {
  let props;

  beforeEach(() => {
    props = {
      hasAdminUser: false,
      isLoading: true,
    };
  });

  it('should not crash', () => {
    shallow(<AppLoader {...props}>{() => null}</AppLoader>);
  });
});
