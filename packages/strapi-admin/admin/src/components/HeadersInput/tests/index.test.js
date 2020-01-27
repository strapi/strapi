import React from 'react';
import { Router, Route, Switch } from 'react-router-dom';
import { shallow } from 'enzyme';
import CreatableSelect from 'react-select/creatable';
import { render, cleanup } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { InputText } from '@buffetjs/core';
import { CircleButton, GlobalContextProvider } from 'strapi-helper-plugin';
import { IntlProvider } from 'react-intl';

import { translationMessages } from '../../../i18n';

import HeadersInput from '../index';

const history = createMemoryHistory();

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
    it('It should not crash', () => {
      shallow(<HeadersInput {...props} />);
    });

    it('render component', () => {
      const intlProvider = new IntlProvider(
        {
          locale: 'en',
          messages: translationMessages.en,
        },
        {}
      );
      const { intl: originalIntl } = intlProvider.getChildContext();

      const { asFragment } = render(
        <IntlProvider locale={intlProvider.locale}>
          <GlobalContextProvider formatMessage={originalIntl.formatMessage}>
            <Router history={history}>
              <Switch>
                <Route>
                  <HeadersInput {...props} />
                </Route>
              </Switch>
            </Router>
          </GlobalContextProvider>
        </IntlProvider>
      );
      expect(asFragment()).toMatchSnapshot();
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
