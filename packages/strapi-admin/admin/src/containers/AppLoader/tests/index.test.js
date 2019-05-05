import React from 'react';
import { shallow } from 'enzyme';

import { AppLoader } from '../index';

describe('<AppLoader />', () => {
  let props;

  beforeEach(() => {
    props = {
      appPlugins: [],
      plugins: {},
    };
  });

  it('should not crash', () => {
    shallow(<AppLoader {...props}>{() => null}</AppLoader>);
  });
});
