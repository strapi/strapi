import React from 'react';
import { shallow } from 'enzyme';

import HeaderNavLink from '../index';

describe('<HeaderNavLink />', () => {
  it('should not crash', () => {
    const onClick = jest.fn();
    shallow(<HeaderNavLink id="app.utils.default" onClick={onClick} />);
  });
});
