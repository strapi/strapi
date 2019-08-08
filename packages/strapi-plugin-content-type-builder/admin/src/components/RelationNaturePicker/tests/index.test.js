import React from 'react';

import { shallow } from 'enzyme';

import { RelationNaturePicker } from '../index';

describe('<RelationNaturePicker />', () => {
  it('should not crash', () => {
    shallow(<RelationNaturePicker />);
  });

  it('should use the defaultProps', () => {
    const {
      defaultProps: { onClick },
    } = RelationNaturePicker;

    expect(onClick).toBeDefined();
    expect(onClick()).toBe(undefined);
  });

  it('should pass the correct data', () => {
    const props = {
      featureName: 'test',
      onClick: jest.fn(),
    };

    const wrapper = shallow(<RelationNaturePicker {...props} />);
    const img = wrapper.find('img').at(0);

    img.simulate('click');

    expect(props.onClick).toHaveBeenCalledWith('oneWay', 'test');
  });

  it('should handle the hint correctly for the oneWay', () => {
    const props = {
      featureName: 'test',
      nature: 'oneWay',
      target: 'othertest',
    };

    const wrapper = shallow(<RelationNaturePicker {...props} />);

    const span = wrapper.find('span').at(0);
    const span1 = wrapper.find('span').at(1);

    expect(span.text()).toBe('test');
    expect(span1.text()).toBe('othertest');
  });

  it('should handle the hint correctly for the ', () => {
    const props = {
      featureName: 'test',
      nature: 'manyWay',
      target: 'othertest',
    };

    const wrapper = shallow(<RelationNaturePicker {...props} />);

    const span = wrapper.find('span').at(0);
    const span1 = wrapper.find('span').at(1);

    expect(span.text()).toBe('test');
    expect(span1.text()).toBe('othertests');
  });
});
