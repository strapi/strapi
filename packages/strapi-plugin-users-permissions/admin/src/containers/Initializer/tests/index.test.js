import React from 'react';
import { mount, shallow } from 'enzyme';

import { Initializer } from '../index';

describe('<Initializer />', () => {
  it('should not crash', () => {
    shallow(<Initializer updatePlugin={jest.fn()} />);
  });

  it('should call the updatePlugin props on mount', () => {
    const props = { updatePlugin: jest.fn() };
    mount(<Initializer {...props} />);

    expect(props.updatePlugin).toHaveBeenCalledWith(
      'users-permissions',
      'isReady',
      true
    );
  });
});
