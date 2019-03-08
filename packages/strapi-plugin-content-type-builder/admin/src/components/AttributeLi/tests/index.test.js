import React from 'react';
import { shallow } from 'enzyme';

import AttributeLi from '../index';

describe('<AttributeLi />', () => {
  it('should not crash', () => {
    shallow(<AttributeLi />);
  });
});
