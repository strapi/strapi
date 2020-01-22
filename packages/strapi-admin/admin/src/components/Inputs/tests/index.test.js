import React from 'react';
import { shallow } from 'enzyme';

import Inputs from '../index';

describe('<Inputs />', () => {
  const props = {
    name: 'events',
    value: ['media.create, media.delete'],
    onChange: jest.fn(),
  };

  it('It should not crash', () => {
    shallow(<Inputs {...props} />);
  });
});
