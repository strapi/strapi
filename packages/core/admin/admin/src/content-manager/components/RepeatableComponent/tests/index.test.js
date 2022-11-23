import * as React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import RepeatableComponent from '../index';

jest.mock('../../../FieldComponent', () => () => "I'm a field component");
jest.mock('../../../Inputs', () => () => "I'm inputs");

const toggleNotification = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn().mockImplementation(() => toggleNotification),
  useCMEditViewDataManager: jest.fn().mockImplementation(() => ({ modifiedData: {} })),
}));

jest.mock('../../../hooks', () => ({
  useContentTypeLayout: jest.fn().mockReturnValue({
    getComponentLayout: jest.fn().mockImplementation((componentUid) => layoutData[componentUid]),
  }),
}));

describe('RepeatableComponents', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const defaultProps = {};

  const TestComponent = (props) => (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <RepeatableComponent {...defaultProps} {...props} />
      </IntlProvider>
    </ThemeProvider>
  );

  const setup = (props) => render(<TestComponent {...props} />);

  describe('rendering', () => {
    it.todo('should render the component initializer when there are no components to render');

    it.todo('should render components & a footer when there are components to render');

    it.todo('should render a passed error message');

    it.todo('should render a specific min error when error message contains the word min');

    it.todo('should render a specific error when components within have an error');
  });

  describe('callbacks', () => {
    it.todo('should call addRepeatableComponentToField when the footer button is clicked');

    it.todo(
      'should fire a notification if the max number of components have been added and the user tries to add another'
    );

    it.todo(
      'should fire neither a notification or addRepeatableComponentToField if the component is read-only'
    );

    it.todo(
      'should fire moveComponentField when a component is drag and dropped to a new location'
    );

    it.todo(
      'should not fire moveComponentField when a component is placed to the same position via drag and drop'
    );
  });

  describe('side effects', () => {
    it.todo('should open the new component by default when it is added');
  });
});
