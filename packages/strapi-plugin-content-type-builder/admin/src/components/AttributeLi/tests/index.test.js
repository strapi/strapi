import React from 'react';
import { shallow } from 'enzyme';
import { FormattedMessage } from 'react-intl';

import AttributeLi from '../index';

describe('<AttributeLi />', () => {
  it('should not crash', () => {
    shallow(<AttributeLi />);
  });

  it('should show the origin of the model if it\'s comming from a plugin', () => {
    const props = {
      attributeInfos: {
        configurable: false,
        plugin: 'users-permissions',
        target: 'role',
        type: 'string',
      },
      name: 'role',
      onClick: jest.fn(),
    };
    const wrapper = shallow(<AttributeLi {...props} />);
    const insideCompo = shallow(wrapper.find(FormattedMessage).last().prop('children')());

    expect(insideCompo.text()).toContain('users-permissions');
  });

  it('should not show the origin of the model if it\'s comming from a plugin', () => {
    const props = {
      attributeInfos: {
        configurable: false,
        plugin: null,
        target: 'role',
        type: 'string',
      },
      name: 'role',
      onClick: jest.fn(),
    };
    const wrapper = shallow(<AttributeLi {...props} />);
    const insideCompo = shallow(wrapper.find(FormattedMessage).last().prop('children')());

    expect(insideCompo.text().trim()).toEqual('Role');
  });
});
