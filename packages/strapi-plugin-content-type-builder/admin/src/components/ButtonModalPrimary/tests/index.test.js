import React from 'react';
import { shallow } from 'enzyme';

import ButtonModalPrimary from '../index';

describe('<ButtonModalPrimary />', () => {
  it('should not crash', () => {
    shallow(<ButtonModalPrimary />);
  });
});
