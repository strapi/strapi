import React from 'react';
import { shallow } from 'enzyme';

import ButtonModalSecondary from '../index';

describe('<ButtonModalSecondary />', () => {
  it('should not crash', () => {
    shallow(<ButtonModalSecondary onClick={jest.fn()} message="" />);
  });
});
