import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { RelationItem } from '../RelationItem';

const setup = ({ endAction, testingDnd = false, ...props }) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <DndProvider backend={HTML5Backend}>
        <RelationItem
          ariaDescribedBy="test"
          iconButtonAriaLabel="Drag"
          canDrag={testingDnd}
          id={0}
          index={0}
          name="test_field"
          endAction={endAction}
          {...props}
        >
          First relation
        </RelationItem>
        {testingDnd ? (
          <RelationItem
            name="test_field"
            ariaDescribedBy="test"
            iconButtonAriaLabel="Drag"
            canDrag={testingDnd}
            id={1}
            index={1}
            endAction={endAction}
            {...props}
          >
            Second relation
          </RelationItem>
        ) : null}
      </DndProvider>
    </ThemeProvider>
  );

describe('Content-Manager || RelationInput || RelationItem', () => {
  it('should render and match snapshot', () => {
    const { container } = setup({});

    expect(container).toMatchSnapshot();
  });

  it('should render endAction and match snapshot', () => {
    const { getByText } = setup({ endAction: <div>end action here</div> });

    expect(getByText('end action here')).toBeInTheDocument();
  });

  describe('Reordering relations', () => {
    it('should not move with arrow keys if the button is not pressed first', () => {
      const updatePositionOfRelationMock = jest.fn();

      setup({
        updatePositionOfRelation: updatePositionOfRelationMock,
        testingDnd: true,
      });

      const [draggedItem] = screen.getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });

      expect(updatePositionOfRelationMock).not.toBeCalled();
    });

    it('should move with the arrow keys if the button has been activated first', () => {
      const updatePositionOfRelationMock = jest.fn();

      setup({ updatePositionOfRelation: updatePositionOfRelationMock, testingDnd: true });

      const [draggedItem] = screen.getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });

      expect(updatePositionOfRelationMock).toBeCalledWith(1, 0);
    });

    it('should move with the arrow keys if the button has been activated and then not move after the button has been deactivated', () => {
      const updatePositionOfRelationMock = jest.fn();

      setup({ updatePositionOfRelation: updatePositionOfRelationMock, testingDnd: true });

      const [draggedItem] = screen.getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });

      expect(updatePositionOfRelationMock).toBeCalledTimes(1);
    });

    it('should exit drag and drop mode when the escape key is pressed', () => {
      const updatePositionOfRelationMock = jest.fn();

      setup({ updatePositionOfRelation: updatePositionOfRelationMock, testingDnd: true });

      const [draggedItem] = screen.getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'Escape', code: 'Escape' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowUp', code: 'ArrowUp' });

      expect(updatePositionOfRelationMock).not.toBeCalled();
    });
  });
});
