import React from 'react';
import { shallow } from 'enzyme';

import HeaderNavLink from '../index';

describe('<HeaderNavLink />', () => {
  it('should not crash', () => {
    shallow(<HeaderNavLink id="app.utils.default" />);
  });
});
