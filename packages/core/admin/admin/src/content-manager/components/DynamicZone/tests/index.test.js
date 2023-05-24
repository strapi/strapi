import React from 'react';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { IntlProvider } from 'react-intl';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { DynamicZone } from '../index';

import { layoutData } from './fixtures';

const toggleNotification = jest.fn();

const TEST_NAME = 'DynamicZoneComponent';

const defaultCMEditViewMock = {
  isCreatingEntry: false,
  addComponentToDynamicZone: jest.fn(),
  removeComponentFromDynamicZone: jest.fn(),
  moveComponentField: jest.fn(),
  createActionAllowedFields: [TEST_NAME],
  updateActionAllowedFields: [TEST_NAME],
  readActionAllowedFields: [TEST_NAME],
  modifiedData: {},
  formErrors: {},
};

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockImplementation(() => ({
    ...defaultCMEditViewMock,
  })),
  useNotification: jest.fn().mockImplementation(() => toggleNotification),
  NotAllowedInput: () => 'This field is not allowed',
}));

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
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
    fieldSchema: {
      components: ['component1', 'component2', 'component3'],
    },
    metadatas: {
      label: 'dynamic zone',
      description: 'dynamic description',
    },
    name: 'DynamicZoneComponent',
  };

  const TestComponent = (props) => <DynamicZone {...defaultProps} {...props} />;

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

  describe('rendering', () => {
    it('should not render the dynamic zone if there are no dynamic components to render', () => {
      const { queryByText } = render();

      expect(queryByText('dynamic zone')).not.toBeInTheDocument();
      expect(queryByText('dynamic description')).not.toBeInTheDocument();
    });

    it('should render the AddComponentButton by default and render the ComponentPicker when that button is clicked', async () => {
      const { getByRole, getByText, user } = render();

      const addComponentButton = getByRole('button', { name: /Add a component to/i });

      expect(addComponentButton).toBeInTheDocument();

      await user.click(addComponentButton);

      expect(getByText('Pick one component')).toBeInTheDocument();
    });

    it('should render the dynamic zone of components when there are dynamic components to render', () => {
      useCMEditViewDataManager.mockImplementationOnce(() => ({
        ...defaultCMEditViewMock,
        modifiedData: {
          [TEST_NAME]: [
            {
              __component: 'component1',
              id: 0,
            },
            {
              __component: 'component2',
              id: 0,
            },
          ],
        },
      }));
      const { getByText } = render();

      expect(getByText('dynamic zone')).toBeInTheDocument();
      expect(getByText('dynamic description')).toBeInTheDocument();

      expect(getByText('component1')).toBeInTheDocument();
      expect(getByText('component2')).toBeInTheDocument();
    });

    it('should render the not allowed input if the field is not allowed & the entry is being created', () => {
      useCMEditViewDataManager.mockImplementationOnce(() => ({
        ...defaultCMEditViewMock,
        isCreatingEntry: true,
        createActionAllowedFields: [],
      }));
      const { queryByText, getByText } = render();

      expect(queryByText('dynamic zone')).not.toBeInTheDocument();

      expect(getByText('This field is not allowed')).toBeInTheDocument();
    });

    it('should render the not allowed input if the field is not allowed & the entry is not being created and the field is not readable', () => {
      useCMEditViewDataManager.mockImplementationOnce(() => ({
        ...defaultCMEditViewMock,
        updateActionAllowedFields: [],
        readActionAllowedFields: [],
      }));
      const { queryByText, getByText } = render();

      expect(queryByText('dynamic zone')).not.toBeInTheDocument();

      expect(getByText('This field is not allowed')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call the addComponentToDynamicZone callback when the AddComponentButton is clicked', async () => {
      const addComponentToDynamicZone = jest.fn();
      useCMEditViewDataManager.mockImplementation(() => ({
        ...defaultCMEditViewMock,
        addComponentToDynamicZone,
      }));

      const { user, getByRole } = render();

      const addComponentButton = getByRole('button', { name: /Add a component to/i });

      await user.click(addComponentButton);

      const componentPickerButton = getByRole('button', {
        name: 'component1',
      });

      await user.click(componentPickerButton);

      expect(addComponentToDynamicZone).toHaveBeenCalledWith(
        'DynamicZoneComponent',
        { category: 'myComponents', info: { displayName: 'component1', icon: undefined } },
        expect.any(Object),
        false,
        undefined
      );
    });

    it('should call the removeComponentFromDynamicZone callback when the RemoveButton is clicked', async () => {
      const removeComponentFromDynamicZone = jest.fn();
      useCMEditViewDataManager.mockImplementationOnce(() => ({
        ...defaultCMEditViewMock,
        removeComponentFromDynamicZone,
        modifiedData: {
          [TEST_NAME]: [
            {
              __component: 'component1',
              id: 0,
            },
            {
              __component: 'component2',
              id: 0,
            },
          ],
        },
      }));

      const { user, getByRole } = render();

      const removeButton = getByRole('button', { name: /Delete component1/i });

      await user.click(removeButton);

      expect(removeComponentFromDynamicZone).toHaveBeenCalledWith('DynamicZoneComponent', 0);
    });
  });

  describe('side effects', () => {
    it('should call the toggleNotification callback if the amount of dynamic components has hit its max and the user tries to add another', async () => {
      useCMEditViewDataManager.mockImplementationOnce(() => ({
        ...defaultCMEditViewMock,
        modifiedData: {
          [TEST_NAME]: [
            {
              __component: 'component1',
              id: 0,
            },
            {
              __component: 'component2',
              id: 0,
            },
            {
              __component: 'component3',
              id: 0,
            },
          ],
        },
      }));

      const { user, getByRole } = render({
        fieldSchema: {
          components: ['component1', 'component2', 'component3'],
          max: 3,
        },
      });

      const addComponentButton = getByRole('button', { name: /Add a component to/i });

      await user.click(addComponentButton);

      expect(toggleNotification).toHaveBeenCalledWith({
        type: 'info',
        message: {
          id: 'content-manager.components.notification.info.maximum-requirement',
        },
      });
    });
  });

  describe('Accessibility', () => {
    it('should have have description text', () => {
      useCMEditViewDataManager.mockImplementationOnce(() => ({
        ...defaultCMEditViewMock,
        modifiedData: {
          [TEST_NAME]: [
            {
              __component: 'component1',
              id: 0,
            },
            {
              __component: 'component2',
              id: 0,
            },
          ],
        },
      }));

      const { queryByText } = render();

      expect(queryByText('Press spacebar to grab and re-order')).toBeInTheDocument();
    });

    it('should update the live text when an item has been grabbed', async () => {
      useCMEditViewDataManager.mockImplementation(() => ({
        ...defaultCMEditViewMock,
        modifiedData: {
          [TEST_NAME]: [
            {
              __component: 'component1',
              id: 0,
            },
            {
              __component: 'component2',
              id: 0,
            },
          ],
        },
      }));

      const { getAllByRole, queryByText, user } = render();

      const [draggedItem] = getAllByRole('button', { name: 'Drag' });

      draggedItem.focus();

      await user.keyboard('[Space]');

      expect(
        queryByText(
          /Press up and down arrow to change position, Spacebar to drop, Escape to cancel/
        )
      ).toBeInTheDocument();
    });

    it('should change the live text when an item has been moved', async () => {
      useCMEditViewDataManager.mockImplementation(() => ({
        ...defaultCMEditViewMock,
        modifiedData: {
          [TEST_NAME]: [
            {
              __component: 'component1',
              id: 0,
            },
            {
              __component: 'component2',
              id: 0,
            },
          ],
        },
      }));

      const { user, getAllByRole, queryByText } = render();

      const [draggedItem] = getAllByRole('button', { name: 'Drag' });

      draggedItem.focus();

      await user.keyboard('[Space]');
      await user.keyboard('[ArrowDown]');

      expect(queryByText(/New position in list/)).toBeInTheDocument();
    });

    it('should change the live text when an item has been dropped', async () => {
      useCMEditViewDataManager.mockImplementation(() => ({
        ...defaultCMEditViewMock,
        modifiedData: {
          [TEST_NAME]: [
            {
              __component: 'component1',
              id: 0,
            },
            {
              __component: 'component2',
              id: 0,
            },
          ],
        },
      }));

      const { getAllByRole, user, queryByText } = render();

      const [draggedItem] = getAllByRole('button', { name: 'Drag' });

      draggedItem.focus();

      await user.keyboard('[Space]');
      await user.keyboard('[ArrowDown]');
      await user.keyboard('[Space]');

      expect(queryByText(/Final position in list/)).toBeInTheDocument();
    });

    it('should change the live text after the reordering interaction has been cancelled', async () => {
      useCMEditViewDataManager.mockImplementation(() => ({
        ...defaultCMEditViewMock,
        modifiedData: {
          [TEST_NAME]: [
            {
              __component: 'component1',
              id: 0,
            },
            {
              __component: 'component2',
              id: 0,
            },
          ],
        },
      }));

      const { getAllByRole, user, queryByText } = render();

      const [draggedItem] = getAllByRole('button', { name: 'Drag' });

      draggedItem.focus();

      await user.keyboard('[Space]');
      await user.keyboard('[Escape]');

      expect(queryByText(/Re-order cancelled/)).toBeInTheDocument();
    });
  });

  describe('Add component button', () => {
    // it('should render the close label if the isOpen prop is true', () => {
    //   render({ isOpen: true });
    //   expect(getByText(/Close/)).toBeInTheDocument();
    // });
    // it('should render the name of the field when the label is an empty string', () => {
    //   render({ label: '' });
    //   expect(getByText(/name/)).toBeInTheDocument();
    // });
    // it('should render a too high error if there is hasMaxError is true and the component is not open', () => {
    //   render({ hasMaxError: true });
    //   expect(getByText(/The value is too high./)).toBeInTheDocument();
    // });
    // it('should render a label telling the user there are X missing components if hasMinError is true and the component is not open', () => {
    //   render({ hasMinError: true });
    //   expect(getByText(/missing components/)).toBeInTheDocument();
    // });
  });
});
