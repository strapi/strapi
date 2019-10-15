import React from 'react';
import { shallow } from 'enzyme';

import RelationBox from '../RelationBox';

describe('<RelationBox />', () => {
  it('should not crash', () => {
    const props = {
      onChange: jest.fn(),
      value: '',
    };
    shallow(<RelationBox {...props} />);
  });

  it('should use the defaultProps', () => {
    const {
      defaultProps: { onClick },
    } = RelationBox;

    expect(onClick).toBeDefined();
    expect(onClick()).toBe(undefined);
  });
});
