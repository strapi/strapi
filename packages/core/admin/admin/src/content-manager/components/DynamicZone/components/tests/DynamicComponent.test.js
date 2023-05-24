import React from 'react';
import { render as renderRTL, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { DynamicComponent } from '../DynamicComponent';

import { layoutData, dynamicComponentsByCategory } from './fixtures';

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
    <>
      <DynamicComponent {...defaultProps} {...restProps} />
      {testingDnd ? <DynamicComponent {...defaultProps} {...restProps} /> : null}
    </>
  );

  const render = (props) => ({
    ...renderRTL(<TestComponent {...props} />, {
      wrapper: ({ children }) => (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} defaultLocale="en">
            <DndProvider backend={HTML5Backend}>{children}</DndProvider>
          </IntlProvider>
        </ThemeProvider>
      ),
    }),
    user: userEvent.setup(),
  });

  it('should by default render the name of the component in the accordion trigger', () => {
    const { getByRole } = render();

    expect(getByRole('button', { name: 'component1' })).toBeInTheDocument();
  });

  it('should allow removal of the component & call the onRemoveComponentClick callback when the field isAllowed', async () => {
    const onRemoveComponentClick = jest.fn();
    const { getByRole, user } = render({ isFieldAllowed: true, onRemoveComponentClick });

    await user.click(getByRole('button', { name: 'Delete component1' }));

    expect(onRemoveComponentClick).toHaveBeenCalled();
  });

  it('should not show you the delete component button if isFieldAllowed is false', () => {
    const { queryByRole } = render({ isFieldAllowed: false });

    expect(queryByRole('button', { name: 'Delete component1' })).not.toBeInTheDocument();
  });

  it('should hide the field component when you close the accordion', async () => {
    const { queryByText, user, getByRole } = render();

    expect(queryByText("I'm a field component")).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'component1' }));

    expect(queryByText("I'm a field component")).not.toBeInTheDocument();
  });

  describe('Keyboard drag and drop', () => {
    it('should not move with arrow keys if the button is not pressed first', () => {
      const onMoveComponent = jest.fn();
      const { getAllByText } = render({
        onMoveComponent,
        testingDnd: true,
      });
      const [draggedItem] = getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(onMoveComponent).not.toBeCalled();
    });

    it('should move with the arrow keys if the button has been activated first', () => {
      const onMoveComponent = jest.fn();
      const { getAllByText } = render({ onMoveComponent, testingDnd: true });
      const [draggedItem] = getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(onMoveComponent).toBeCalledWith(1, 0);
    });

    it('should move with the arrow keys if the button has been activated and then not move after the button has been deactivated', () => {
      const onMoveComponent = jest.fn();
      const { getAllByText } = render({ onMoveComponent, testingDnd: true });
      const [draggedItem] = getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(onMoveComponent).toBeCalledTimes(1);
    });

    it('should exit drag and drop mode when the escape key is pressed', () => {
      const onMoveComponent = jest.fn();
      const { getAllByText } = render({ onMoveComponent, testingDnd: true });
      const [draggedItem] = getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'Escape', code: 'Escape' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowUp', code: 'ArrowUp' });
      expect(onMoveComponent).not.toBeCalled();
    });
  });

  describe('adding above and below components', () => {
    it('should render a menu button with two items that have submenus that list the components grouped by categories', async () => {
      const { getByRole, getByText, user } = render({ dynamicComponentsByCategory });

      expect(getByRole('button', { name: 'More actions' })).toBeInTheDocument();

      await user.click(getByRole('button', { name: 'More actions' }));

      expect(getByRole('menuitem', { name: 'Add item above' })).toBeInTheDocument();
      expect(getByRole('menuitem', { name: 'Add item below' })).toBeInTheDocument();

      await user.click(getByRole('menuitem', { name: 'Add item above' }));

      expect(getByText('myComponents')).toBeInTheDocument();
      expect(getByText('otherComponents')).toBeInTheDocument();

      expect(getByRole('menuitem', { name: 'component1' })).toBeInTheDocument();
      expect(getByRole('menuitem', { name: 'component2' })).toBeInTheDocument();
      expect(getByRole('menuitem', { name: 'component3' })).toBeInTheDocument();

      await user.click(getByRole('menuitem', { name: 'Add item below' }));

      expect(getByText('myComponents')).toBeInTheDocument();
      expect(getByText('otherComponents')).toBeInTheDocument();

      expect(getByRole('menuitem', { name: 'component1' })).toBeInTheDocument();
      expect(getByRole('menuitem', { name: 'component2' })).toBeInTheDocument();
      expect(getByRole('menuitem', { name: 'component3' })).toBeInTheDocument();
    });

    it('should call the onAddComponent callback with the correct index when adding above', async () => {
      const onAddComponent = jest.fn();
      const { getByRole, user } = render({ dynamicComponentsByCategory, onAddComponent, index: 0 });

      await user.click(getByRole('button', { name: 'More actions' }));
      await user.click(getByRole('menuitem', { name: 'Add item above' }));

      /**
       * @note – for some reason, user.click() doesn't work here
       */
      fireEvent.click(getByRole('menuitem', { name: 'component1' }));

      expect(onAddComponent).toHaveBeenCalledWith('component1', -1);
    });

    it('should call the onAddComponent callback with the correct index when adding below', async () => {
      const onAddComponent = jest.fn();
      const { getByRole, user } = render({ dynamicComponentsByCategory, onAddComponent, index: 0 });

      await user.click(getByRole('button', { name: 'More actions' }));
      await user.click(getByRole('menuitem', { name: 'Add item below' }));

      /**
       * @note – for some reason, user.click() doesn't work here
       */
      fireEvent.click(getByRole('menuitem', { name: 'component1' }));

      expect(onAddComponent).toHaveBeenCalledWith('component1', 1);
    });
  });

  it.todo('should handle errors in the fields');
});
