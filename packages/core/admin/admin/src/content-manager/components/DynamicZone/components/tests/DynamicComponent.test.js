import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import DynamicComponent from '../DynamicComponent';

import { layoutData } from './fixtures';

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  useContentTypeLayout: jest.fn().mockReturnValue({
    getComponentLayout: jest.fn().mockImplementation((componentUid) => layoutData[componentUid]),
  }),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockImplementation(() => ({ modifiedData: {} })),
}));

/**
 * We _could_ unmock this and use it, but it requires more
 * harnessing then is necessary and it's not worth it for these
 * tests when really we're focussing on dynamic zone behaviour.
 */
jest.mock('../../../FieldComponent', () => () => "I'm a field component");

describe('DynamicComponent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const defaultProps = {
    componentUid: 'component1',
    name: 'dynamiczone',
    onMoveComponent: jest.fn(),
    onRemoveComponentClick: jest.fn(),
  };

  // eslint-disable-next-line react/prop-types
  const TestComponent = ({ testingDnd, ...restProps }) => (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <DndProvider backend={HTML5Backend}>
          <DynamicComponent {...defaultProps} {...restProps} />
          {testingDnd ? <DynamicComponent {...defaultProps} {...restProps} /> : null}
        </DndProvider>
      </IntlProvider>
    </ThemeProvider>
  );

  const setup = (props) => render(<TestComponent {...props} />);

  it('should by default render the name of the component in the accordion trigger', () => {
    setup();

    expect(screen.getByRole('button', { name: 'component1' })).toBeInTheDocument();
  });

  it('should allow removal of the component & call the onRemoveComponentClick callback when the field isAllowed', () => {
    const onRemoveComponentClick = jest.fn();
    setup({ isFieldAllowed: true, onRemoveComponentClick });

    fireEvent.click(screen.getByRole('button', { name: 'Delete component1' }));

    expect(onRemoveComponentClick).toHaveBeenCalled();
  });

  it('should not show you the delete component button if isFieldAllowed is false', () => {
    setup({ isFieldAllowed: false });

    expect(screen.queryByRole('button', { name: 'Delete component1' })).not.toBeInTheDocument();
  });

  it('should hide the field component when you close the accordion', () => {
    setup();

    expect(screen.queryByText("I'm a field component")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'component1' }));

    expect(screen.queryByText("I'm a field component")).not.toBeInTheDocument();
  });

  describe('Keyboard drag and drop', () => {
    it('should not move with arrow keys if the button is not pressed first', () => {
      const onMoveComponent = jest.fn();
      setup({
        onMoveComponent,
        testingDnd: true,
      });
      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(onMoveComponent).not.toBeCalled();
    });

    it('should move with the arrow keys if the button has been activated first', () => {
      const onMoveComponent = jest.fn();
      setup({ onMoveComponent, testingDnd: true });
      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(onMoveComponent).toBeCalledWith(1, 0);
    });

    it('should move with the arrow keys if the button has been activated and then not move after the button has been deactivated', () => {
      const onMoveComponent = jest.fn();
      setup({ onMoveComponent, testingDnd: true });
      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(onMoveComponent).toBeCalledTimes(1);
    });

    it('should exit drag and drop mode when the escape key is pressed', () => {
      const onMoveComponent = jest.fn();
      setup({ onMoveComponent, testingDnd: true });
      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'Escape', code: 'Escape' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowUp', code: 'ArrowUp' });
      expect(onMoveComponent).not.toBeCalled();
    });
  });

  it.todo('should handle errors in the fields');
});
