import React from 'react';
import { shallow } from 'enzyme';

import NaturePicker from '../NaturePicker';

describe('<NaturePicker />', () => {
  it('should not crash', () => {
    shallow(<NaturePicker />);
  });

  it('should use the defaultProps', () => {
    const {
      defaultProps: { onClick },
    } = NaturePicker;

    expect(onClick).toBeDefined();
    expect(onClick()).toBe(undefined);
  });

  it('should pass the correct data', () => {
    const props = {
      modelName: 'test',
      onClick: jest.fn(),
    };

    const wrapper = shallow(<NaturePicker {...props} />);
    const img = wrapper.find('img').at(0);

    img.simulate('click');

    expect(props.onClick).toHaveBeenCalledWith('oneWay', 'test');
  });

  it('should handle the hint correctly for the oneWay', () => {
    const props = {
      modelName: 'test',
      nature: 'oneWay',
      target: 'othertest',
    };

    const wrapper = shallow(<NaturePicker {...props} />);

    const span = wrapper.find('span').at(0);
    const span1 = wrapper.find('span').at(1);

    expect(span.text()).toBe('test');
    expect(span1.text()).toBe('othertest');
  });

  it('should handle the hint correctly for the oneToOne', () => {
    const props = {
      modelName: 'test',
      nature: 'oneToOne',
      target: 'othertest',
    };

    const wrapper = shallow(<NaturePicker {...props} />);

    const span = wrapper.find('span').at(0);
    const span1 = wrapper.find('span').at(1);

    expect(span.text()).toBe('test');
    expect(span1.text()).toBe('othertest');
  });

  it('should handle the hint correctly for the manyToMany', () => {
    const props = {
      modelName: 'test',
      nature: 'manyToMany',
      target: 'othertest',
    };

    const wrapper = shallow(<NaturePicker {...props} />);

    const span = wrapper.find('span').at(0);
    const span1 = wrapper.find('span').at(1);

    expect(span.text()).toBe('tests');
    expect(span1.text()).toBe('othertests');
  });

  it('should handle the hint correctly for the manyToOne', () => {
    const props = {
      modelName: 'test',
      nature: 'manyToOne',
      target: 'othertest',
    };

    const wrapper = shallow(<NaturePicker {...props} />);

    const span = wrapper.find('span').at(0);
    const span1 = wrapper.find('span').at(1);

    expect(span.text()).toBe('othertest');
    expect(span1.text()).toBe('tests');
  });

  it('should handle the hint correctly for the oneToMany', () => {
    const props = {
      modelName: 'test',
      nature: 'oneToMany',
      target: 'othertest',
    };

    const wrapper = shallow(<NaturePicker {...props} />);

    const span = wrapper.find('span').at(0);
    const span1 = wrapper.find('span').at(1);

    expect(span.text()).toBe('test');
    expect(span1.text()).toBe('othertests');
  });
});
