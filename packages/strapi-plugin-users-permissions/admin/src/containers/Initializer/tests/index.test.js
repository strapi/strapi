import React from 'react';
import { shallow } from 'enzyme';

import { Initializer } from '../index';

describe('<Initializer />', () => {
  it('Should not crash', () => {
    shallow(<Initializer />);
  });
});
