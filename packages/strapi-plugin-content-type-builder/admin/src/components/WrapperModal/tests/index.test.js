import React from 'react';
import { shallow } from 'enzyme';

import WrapperModal from '../index';

describe('<WrapperModal />', () => {
  it('should not crash', () => {
    shallow(<WrapperModal />);
  });
});
