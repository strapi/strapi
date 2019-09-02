import React from 'react';
import { shallow } from 'enzyme';
import LeftMenuSectionTitle from '../index';

describe('<LeftMenuSectionTitle />', () => {
  it('should not crash', () => {
    shallow(<LeftMenuSectionTitle />);
  });
});
