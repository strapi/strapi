import React from 'react';
import { shallow } from 'enzyme';
import { DropdownToggle, DropdownItem } from 'reactstrap';
import ModelPicker from '../ModelPicker';

describe('<ModelPicker />', () => {
  it('should not crash', () => {
    shallow(<ModelPicker />);
  });

  it('should use the defaultProps', () => {
    const {
      defaultProps: { onClick },
    } = ModelPicker;

    expect(onClick).toBeDefined();
    expect(onClick()).toBe(undefined);
  });

  it('should display the source if the model has one', () => {
    const props = {
      models: [
        {
          icon: 'fa-cube',
          name: 'permission',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
      ],
      onClick: jest.fn(),
    };

    const wrapper = shallow(<ModelPicker {...props} />);
    const dropItem = wrapper.find(DropdownItem);

    expect(dropItem).toHaveLength(1);

    dropItem.at(0).simulate('click');

    expect(props.onClick).toHaveBeenCalledWith(props.models[0]);
    expect(dropItem.find('p').text()).toContain('users-permissions');
  });

  it('should display the plugin if the model has one', () => {
    const props = {
      plugin: 'test',
      onClick: jest.fn(),
    };

    const wrapper = shallow(<ModelPicker {...props} />);
    const dropToggle = wrapper.find(DropdownToggle);

    expect(dropToggle.find('p').text()).toContain('test');
  });
});
