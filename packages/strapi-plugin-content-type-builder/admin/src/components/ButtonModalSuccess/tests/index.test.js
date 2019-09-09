import React from 'react';
import { shallow } from 'enzyme';

import { ButtonModalSuccess } from '../index';

describe('<ButtonModalSuccess />', () => {
  it('should not crash', () => {
    shallow(<ButtonModalSuccess onClick={jest.fn()} message="" />);
  });
});
