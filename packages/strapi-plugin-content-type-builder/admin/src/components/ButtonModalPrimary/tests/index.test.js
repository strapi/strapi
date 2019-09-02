import React from 'react';
import { shallow } from 'enzyme';

import ButtonModalPrimary from '../index';

describe('<ButtonModalPrimary />', () => {
  it('should not crash', () => {
    shallow(<ButtonModalPrimary />);
  });

  it('should use the defaultProps', () => {
    const {
      defaultProps: { onClick },
    } = ButtonModalPrimary;

    expect(onClick).toBeDefined();
    expect(onClick()).toBe(undefined);
  });
});
