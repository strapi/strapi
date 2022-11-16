import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import { DynamicZone } from '../index';

import { layoutData } from './fixtures';

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => null,
}));

const toggleNotification = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockImplementation(() => ({ modifiedData: {} })),
  useNotification: jest.fn().mockImplementation(() => toggleNotification),
  NotAllowedInput: () => 'This field is not allowed',
}));

jest.mock('../../../hooks', () => ({
  useContentTypeLayout: jest.fn().mockReturnValue({
    getComponentLayout: jest.fn().mockImplementation((componentUid) => layoutData[componentUid]),
  }),
}));

/**
 * We _could_ unmock this and use it, but it requires more
 * harnessing then is necessary and it's not worth it for these
 * tests when really we're focussing on dynamic zone behaviour.
 */
jest.mock('../../FieldComponent', () => () => "I'm a field component");

describe('DynamicZone', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const defaultProps = {
    addComponentToDynamicZone: jest.fn(),
    isCreatingEntry: true,
    isFieldAllowed: true,
    isFieldReadable: true,
    fieldSchema: {
      components: ['component1', 'component2', 'component3'],
    },
    formErrors: {},
    metadatas: {
      label: 'dynamic zone',
      description: 'dynamic description',
    },
    moveComponentDown: jest.fn(),
    moveComponentUp: jest.fn(),
    name: 'DynamicZoneComponent',
    removeComponentFromDynamicZone: jest.fn(),
  };

  const TestComponent = (props) => (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <DynamicZone {...defaultProps} {...props} />
      </IntlProvider>
    </ThemeProvider>
  );

  const setup = (props) => render(<TestComponent {...props} />);

  describe('rendering', () => {
    it('should not render the dynamic zone if there are no dynamic components to render', () => {
      setup();

      expect(screen.queryByText('dynamic zone')).not.toBeInTheDocument();
      expect(screen.queryByText('dynamic description')).not.toBeInTheDocument();
    });

    it('should render the AddComponentButton by default and render the ComponentPicker when that button is clicked', () => {
      setup();

      const addComponentButton = screen.getByRole('button', { name: /Add a component to/i });

      expect(addComponentButton).toBeInTheDocument();

      fireEvent.click(addComponentButton);

      expect(screen.getByText('Pick one component')).toBeInTheDocument();
    });

    it('should render the dynamic zone of components when there are dynamic components to render', () => {
      setup({
        dynamicDisplayedComponents: ['component1', 'component2'],
      });

      expect(screen.getByText('dynamic zone')).toBeInTheDocument();
      expect(screen.getByText('dynamic description')).toBeInTheDocument();

      expect(screen.getByText('component1')).toBeInTheDocument();
      expect(screen.getByText('component2')).toBeInTheDocument();
    });

    it('should render the not allowed input if the field is not allowed & the entry is being created', () => {
      setup({
        isFieldAllowed: false,
        isCreatingEntry: true,
      });

      expect(screen.queryByText('dynamic zone')).not.toBeInTheDocument();

      expect(screen.getByText('This field is not allowed')).toBeInTheDocument();
    });

    it('should render the not allowed input if the field is not allowed & the entry is not being created and the field is not readable', () => {
      setup({
        isFieldAllowed: false,
        isCreatingEntry: false,
        isFieldReadable: false,
      });

      expect(screen.queryByText('dynamic zone')).not.toBeInTheDocument();

      expect(screen.getByText('This field is not allowed')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call the addComponentToDynamicZone callback when the AddComponentButton is clicked', () => {
      const addComponentToDynamicZone = jest.fn();

      setup({ addComponentToDynamicZone });

      const addComponentButton = screen.getByRole('button', { name: /Add a component to/i });

      fireEvent.click(addComponentButton);

      const componentPickerButton = screen.getByRole('button', {
        name: /component1/i,
      });

      fireEvent.click(componentPickerButton);

      expect(addComponentToDynamicZone).toHaveBeenCalledWith(
        'DynamicZoneComponent',
        { category: 'myComponents', info: { displayName: 'component1', icon: undefined } },
        undefined,
        false
      );
    });

    it('should call the moveComponentDown callback when the MoveDownButton is clicked', () => {
      const moveComponentDown = jest.fn();

      setup({
        moveComponentDown,
        dynamicDisplayedComponents: ['component1', 'component2'],
      });

      const moveDownButton = screen.getByRole('button', { name: /Move component down/i });

      fireEvent.click(moveDownButton);

      expect(moveComponentDown).toHaveBeenCalledWith('DynamicZoneComponent', 0);
    });

    it('should call the moveComponentUp callback when the MoveUpButton is clicked', () => {
      const moveComponentUp = jest.fn();

      setup({
        moveComponentUp,
        dynamicDisplayedComponents: ['component1', 'component2'],
      });

      const moveUpButton = screen.getByRole('button', { name: /Move component up/i });

      fireEvent.click(moveUpButton);

      expect(moveComponentUp).toHaveBeenCalledWith('DynamicZoneComponent', 1);
    });

    it('should call the removeComponentFromDynamicZone callback when the RemoveButton is clicked', () => {
      const removeComponentFromDynamicZone = jest.fn();

      setup({
        removeComponentFromDynamicZone,
        dynamicDisplayedComponents: ['component1', 'component2'],
      });

      const removeButton = screen.getByRole('button', { name: /Delete component1/i });

      fireEvent.click(removeButton);

      expect(removeComponentFromDynamicZone).toHaveBeenCalledWith('DynamicZoneComponent', 0);
    });
  });

  describe('side effects', () => {
    it('should call the toggleNotification callback if the amount of dynamic components has hit its max and the user tries to add another', () => {
      setup({
        dynamicDisplayedComponents: ['component1', 'component2', 'component3'],
        fieldSchema: {
          components: ['component1', 'component2', 'component3'],
          max: 3,
        },
      });

      const addComponentButton = screen.getByRole('button', { name: /Add a component to/i });

      fireEvent.click(addComponentButton);

      expect(toggleNotification).toHaveBeenCalledWith({
        type: 'info',
        message: {
          id: 'content-manager.components.notification.info.maximum-requirement',
        },
      });
    });
  });
});
