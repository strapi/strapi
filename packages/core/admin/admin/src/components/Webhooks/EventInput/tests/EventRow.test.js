import React from 'react';
import { shallow } from 'enzyme';
import renderer from 'react-test-renderer';
import { Checkbox } from '@buffetjs/core';

import EventRow from '../EventRow';

describe('<EventRow />', () => {
  const props = {
    name: 'events',
    events: ['entry.create', 'entry.update', 'entry.delete'],
    inputValue: ['entry.create'],
    handleChange: jest.fn(),
    handleChangeAll: jest.fn(),
  };

  it('should match the snapshot', () => {
    const tree = renderer.create(<EventRow {...props} />).toJSON();

    expect(tree).toMatchSnapshot();
  });

  it('should call handleChangeAll on first checkbox change', () => {
    const renderedComponent = shallow(<EventRow {...props} />);
    const event = {
      target: { name: 'events', value: true },
    };

    const selectAllCheckbox = renderedComponent
      .find('td')
      .at(0)
      .find(Checkbox);
    selectAllCheckbox.simulate('change', event);

    expect(props.handleChangeAll).toHaveBeenCalledWith(event);
  });

  it('should call handleChange on other checkboxes change', () => {
    const renderedComponent = shallow(<EventRow {...props} />);
    const event = {
      target: { name: 'events', value: true },
    };

    const checkbox = renderedComponent
      .find('td')
      .at(1)
      .find(Checkbox);
    checkbox.simulate('change', event);

    expect(props.handleChange).toHaveBeenCalledWith(event);
  });

  it('should have default handleChange', () => {
    expect(EventRow.defaultProps.handleChange).toBeDefined();
  });

  it('should have default handleChangeAll', () => {
    expect(EventRow.defaultProps.handleChangeAll).toBeDefined();
  });
});
