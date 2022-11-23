import * as React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import Component from '../Component';

jest.mock('../../../FieldComponent', () => () => "I'm a field component");
jest.mock('../../../Inputs', () => () => "I'm inputs");

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockImplementation(() => ({ modifiedData: {} })),
}));

describe('RepeatableComponent | Component', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const defaultProps = {};

  const TestComponent = (props) => (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <Component {...defaultProps} {...props} />
      </IntlProvider>
    </ThemeProvider>
  );

  const setup = (props) => render(<TestComponent {...props} />);

  it.todo('should render my accordion by default');

  it.todo('should not render my accordion actions if the component is read only');

  it.todo('should render an input per field');

  it.todo('should render the field component if there is a component field passed');

  it.todo('should render an error message if the component has errors');

  describe('Keyboard drag and drop', () => {
    it.skip('should not move with arrow keys if the button is not pressed first', () => {
      // const updatePositionOfRelationMock = jest.fn();
      // setup({
      //   updatePositionOfRelation: updatePositionOfRelationMock,
      //   testingDnd: true,
      // });
      // const [draggedItem] = screen.getAllByText('Drag');
      // fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      // expect(updatePositionOfRelationMock).not.toBeCalled();
    });

    it.skip('should move with the arrow keys if the button has been activated first', () => {
      // const updatePositionOfRelationMock = jest.fn();
      // setup({ updatePositionOfRelation: updatePositionOfRelationMock, testingDnd: true });
      // const [draggedItem] = screen.getAllByText('Drag');
      // fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      // fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      // expect(updatePositionOfRelationMock).toBeCalledWith(1, 0);
    });

    it.skip('should move with the arrow keys if the button has been activated and then not move after the button has been deactivated', () => {
      // const updatePositionOfRelationMock = jest.fn();
      // setup({ updatePositionOfRelation: updatePositionOfRelationMock, testingDnd: true });
      // const [draggedItem] = screen.getAllByText('Drag');
      // fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      // fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      // fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      // fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      // expect(updatePositionOfRelationMock).toBeCalledTimes(1);
    });

    it.skip('should exit drag and drop mode when the escape key is pressed', () => {
      // const updatePositionOfRelationMock = jest.fn();
      // setup({ updatePositionOfRelation: updatePositionOfRelationMock, testingDnd: true });
      // const [draggedItem] = screen.getAllByText('Drag');
      // fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      // fireEvent.keyDown(draggedItem, { key: 'Escape', code: 'Escape' });
      // fireEvent.keyDown(draggedItem, { key: 'ArrowUp', code: 'ArrowUp' });
      // expect(updatePositionOfRelationMock).not.toBeCalled();
    });
  });
});
