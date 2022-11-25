import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import Component from '../Component';

jest.mock('../../../FieldComponent', () => () => "I'm a field component");
jest.mock('../../../Inputs', () => () => "I'm inputs");

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockImplementation(() => ({
    modifiedData: {
      test: {
        test: 'repetable-component',
        drag: 'repetable-component2',
      },
    },
  })),
}));

describe('RepeatableComponent | Component', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const defaultProps = {
    componentFieldName: 'test',
    index: 0,
    mainField: 'test',
    moveComponentField: jest.fn(),
    onClickToggle: jest.fn(),
  };

  // eslint-disable-next-line react/prop-types
  const TestComponent = ({ testingDnd, ...props }) => (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <DndProvider backend={HTML5Backend}>
          <Component {...defaultProps} {...props} />
          {testingDnd ? <Component {...defaultProps} {...props} mainField="drag" /> : null}
        </DndProvider>
      </IntlProvider>
    </ThemeProvider>
  );

  const setup = (props) => render(<TestComponent {...props} />);

  it('should render my accordion by default', () => {
    const { getByRole, queryByText } = setup();

    expect(getByRole('button', { name: 'repetable-component' })).toBeInTheDocument();
    expect(queryByText("I'm a field component")).not.toBeInTheDocument();
    expect(queryByText("I'm inputs")).not.toBeInTheDocument();
  });

  it('should not render my accordion actions if the component is read only', () => {
    const { queryByRole } = setup({ isReadOnly: true });

    expect(queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(queryByRole('button', { name: 'Drag' })).not.toBeInTheDocument();
  });

  it('should render an input per field', () => {
    const { getAllByText } = setup({
      isOpen: true,
      fields: [
        [
          {
            name: 'input1',
            fieldSchema: {
              type: 'text',
            },
          },
          {
            name: 'input2',
            fieldSchema: {
              type: 'text',
            },
          },
        ],
      ],
    });

    expect(getAllByText("I'm inputs")).toHaveLength(2);
  });

  it('should render the field component if there is a component field passed', () => {
    const { getAllByText } = setup({
      isOpen: true,
      fields: [
        [
          {
            name: 'input1',
            fieldSchema: {
              type: 'component',
            },
            metadatas: {
              label: 'input1-label',
            },
          },
          {
            name: 'input2',
            fieldSchema: {
              type: 'component',
            },
            metadatas: {
              label: 'input2-label',
            },
          },
        ],
      ],
    });

    expect(getAllByText("I'm a field component")).toHaveLength(2);
  });

  describe('Keyboard drag and drop', () => {
    it('should not move with arrow keys if the button is not pressed first', () => {
      const moveComponentField = jest.fn();
      setup({
        moveComponentField,
        testingDnd: true,
      });
      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(moveComponentField).not.toBeCalled();
    });

    it('should move with the arrow keys if the button has been activated first', () => {
      const moveComponentField = jest.fn();
      setup({ moveComponentField, testingDnd: true });
      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(moveComponentField).toBeCalledWith(1, 0);
    });

    it('should move with the arrow keys if the button has been activated and then not move after the button has been deactivated', () => {
      const moveComponentField = jest.fn();
      setup({ moveComponentField, testingDnd: true });
      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(moveComponentField).toBeCalledTimes(1);
    });

    it('should exit drag and drop mode when the escape key is pressed', () => {
      const moveComponentField = jest.fn();
      setup({ moveComponentField, testingDnd: true });
      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'Escape', code: 'Escape' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowUp', code: 'ArrowUp' });
      expect(moveComponentField).not.toBeCalled();
    });
  });
});
