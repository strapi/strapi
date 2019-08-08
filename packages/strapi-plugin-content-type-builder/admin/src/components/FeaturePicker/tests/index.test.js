import React from 'react';
import { shallow } from 'enzyme';
import { Dropdown, DropdownItem, DropdownToggle } from 'reactstrap';

import { FeaturePicker } from '../index';

describe('CTB <FeaturePicker />', () => {
  it('should use the defaultProps', () => {
    const {
      defaultProps: { onClick },
    } = FeaturePicker;

    expect(onClick).toBeDefined();
    expect(onClick()).toBe(undefined);
  });

  describe('<FeaturePicker /> render', () => {
    let wrapper;
    const setIsOpen = jest.fn();
    const useStateSpy = jest.spyOn(React, 'useState');

    useStateSpy.mockImplementation(init => [init, setIsOpen]);
    let props = {
      features: [
        {
          icon: 'fa-cube',
          name: 'group1',
          description: '',
          fields: 2,
          source: null,
          isTemporary: false,
        },
        {
          icon: 'fa-cube',
          name: 'group2',
          description: '',
          fields: 2,
          source: null,
          isTemporary: false,
        },
      ],
    };

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should display plugin if it exists', () => {
      props.main = true;
      props.plugin = 'users-permissions';

      wrapper = shallow(<FeaturePicker {...props} />);

      const span = wrapper
        .find(DropdownToggle)
        .find('p')
        .at(0)
        .find('span');

      expect(span.text()).toContain('users-permissions');
    });

    it('should display source if it exists', () => {
      props.main = true;
      props.features[0].source = 'users-permissions';

      wrapper = shallow(<FeaturePicker {...props} />);

      const span = wrapper
        .find(DropdownItem)
        .at(0)
        .find('span');

      expect(span.text()).toContain('users-permissions');
    });

    it('should call setIsOpen with true param', () => {
      wrapper = shallow(<FeaturePicker {...props} />);

      const button = wrapper.find(Dropdown);
      const { toggle } = button.props();

      toggle();
      expect(useStateSpy).toHaveBeenCalled();
    });

    it('should call onClick with true param on dropdown item click', () => {
      props.selectedFeature = 'group2';
      props.onClick = jest.fn();
      wrapper = shallow(<FeaturePicker {...props} />);

      const item = wrapper.find(DropdownItem).first();
      item.simulate('click');

      expect(props.onClick).toHaveBeenCalledWith(props.features[0]);
    });
  });
});
