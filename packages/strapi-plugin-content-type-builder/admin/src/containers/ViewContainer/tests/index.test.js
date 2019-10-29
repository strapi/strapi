import React from 'react';
import { shallow } from 'enzyme';

import ViewContainer from '../index';

const renderCompo = (props = {}) => {
  shallow(<ViewContainer {...props} />);
};

const defaultProps = {
  children: null,
};

describe('CTB <ViewContainer />', () => {
  it('should not crash', () => {
    renderCompo(defaultProps);
  });
});
