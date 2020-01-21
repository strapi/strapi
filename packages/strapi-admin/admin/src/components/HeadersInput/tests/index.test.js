import React from 'react';
import { shallow } from 'enzyme';

import { CircleButton } from 'strapi-helper-plugin';
import HeadersInput from '../index';


describe('Admin | components | HeadersInput', () => {
  const props = {
    name: 'headers',
    value: [
      {
        key: '',
        value: '',
      },
    ],
    onChange: jest.fn(),
    onClick: jest.fn(),
    onRemove: jest.fn(),
  };
  describe('Render', () => {
    it('It should render properly', () => {
      shallow(<HeadersInput {...props} />);
    });
  });

  describe('Actions', () => {
    it('It should call the onClick props on remove button', () => {
      const renderedComponent = shallow(<HeadersInput {...props} />);

      const removeButton = renderedComponent.find(CircleButton).at(0);
      removeButton.simulate('click');

      expect(props.onRemove).toHaveBeenCalled();
    });
  });

  it('It should call the onClick props on add button', () => {
    const renderedComponent = shallow(<HeadersInput {...props} />);

    const addButton = renderedComponent.find('ul + button');
    addButton.simulate('click');

    expect(props.onClick).toHaveBeenCalled();
  });
});
