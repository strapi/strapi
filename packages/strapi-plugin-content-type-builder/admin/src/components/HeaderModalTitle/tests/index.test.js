import React from 'react';
import { shallow } from 'enzyme';

import HeaderModalTitle from '../index';

describe('<HeaderModalTitle />', () => {
  it('should not crash', () => {
    shallow(<HeaderModalTitle title="app.utils.defaultTitle" />);
  });
});
