import React from 'react';
import { shallow } from 'enzyme';
import CreatableSelect from 'react-select/creatable';
import { render, cleanup } from '@testing-library/react';
import { InputText } from '@buffetjs/core';
import { CircleButton } from 'strapi-helper-plugin';
import { IntlProvider } from 'react-intl';

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

  describe('should render properly', () => {
    afterEach(cleanup);

    it('should not crash', () => {
      shallow(<HeadersInput {...props} />);
    });

    it('should match the snapshot', () => {
      const { asFragment } = render(
        <IntlProvider locale="en" textComponent="span">
          <HeadersInput {...props} />
        </IntlProvider>
      );

      expect(asFragment()).toMatchSnapshot();
    });

    it('should render as many rows as value length', () => {
      const renderedComponent = shallow(<HeadersInput {...props} />);

      expect(renderedComponent.find(CreatableSelect)).toHaveLength(1);
    });

    it('should have default onRemove', () => {
      expect(HeadersInput.defaultProps.onRemove).toBeDefined();
    });
  });

  describe('Actions', () => {
    it('should call onRemove props on remove button click', () => {
      const headers = [
        {
          key: 'Accept',
          value: 'text/html',
        },
        {
          key: 'Authorization',
          value: 'Basic YWxhZGRpbjpvcGVuc2VzYW1l',
        },
      ];
      const renderedComponent = shallow(<HeadersInput {...props} value={headers} />);

      const removeButton = renderedComponent.find(CircleButton).at(0);
      removeButton.simulate('click');

      expect(props.onRemove).toHaveBeenCalledWith(0);
    });

    it('should call onClick props on add button click', () => {
      const renderedComponent = shallow(<HeadersInput {...props} />);

      const addButton = renderedComponent.find('ul + button');
      addButton.simulate('click');

      expect(props.onClick).toHaveBeenCalledWith('headers');
    });

    it('should call the onChange props on input text change', () => {
      const renderedComponent = shallow(<HeadersInput {...props} />);

      const input = renderedComponent.find(InputText).at(0);
      const event = {
        target: { name: 'headers.0.key', value: 'test' },
      };

      input.simulate('change', event);

      expect(props.onChange).toHaveBeenCalledWith(event);
    });
  });
});
