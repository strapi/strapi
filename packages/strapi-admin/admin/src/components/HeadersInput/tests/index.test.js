import React from 'react';
import { shallow } from 'enzyme';
import CreatableSelect from 'react-select/creatable';

import { InputText } from '@buffetjs/core';
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

    it('It should render as many key/value rows as value', () => {
      const renderedComponent = shallow(<HeadersInput {...props} />);

      expect(renderedComponent.find(CreatableSelect)).toHaveLength(1);
    });
  });

  describe('Actions', () => {
    it('It should call the onClick props on remove button', () => {
      const renderedComponent = shallow(<HeadersInput {...props} />);

      const removeButton = renderedComponent.find(CircleButton).at(0);
      removeButton.simulate('click');

      expect(props.onRemove).toHaveBeenCalledWith(0);
    });
  });

  it('It should call the onClick props on add button', () => {
    const renderedComponent = shallow(<HeadersInput {...props} />);

    const addButton = renderedComponent.find('ul + button');
    addButton.simulate('click');

    expect(props.onClick).toHaveBeenCalled();
  });

  it('It should call the onChange props on input text change', () => {
    const renderedComponent = shallow(<HeadersInput {...props} />);

    const input = renderedComponent.find(InputText).at(0);
    input.simulate('change');

    expect(props.onChange).toHaveBeenCalled();
  });

  it('should have default onRemove', () => {
    expect(HeadersInput.defaultProps.onRemove).toBeDefined();
  });
});
