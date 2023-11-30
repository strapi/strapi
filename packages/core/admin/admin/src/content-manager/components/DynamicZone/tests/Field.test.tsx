import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { act, render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';

import { DynamicZone, DynamicZoneProps } from '../Field';

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

jest.mock('../../../hooks/useContentTypeLayout', () => ({
  useContentTypeLayout: jest.fn().mockReturnValue({
    components: {},
    getComponentLayout: jest.fn().mockImplementation((componentUid) => layoutData[componentUid]),
  }),
}));

/**
 * We _could_ unmock this and use it, but it requires more
 * harnessing then is necessary and it's not worth it for these
 * tests when really we're focussing on dynamic zone behaviour.
 */
jest.mock('../../FieldComponent', () => ({
  FieldComponent: () => "I'm a field component",
}));

describe('DynamicZone', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    fieldSchema: {
      type: 'dynamiczone',
      components: ['component1', 'component2', 'component3'],
    },
    metadatas: {
      label: 'dynamic zone',
      description: 'dynamic description',
    },
    name: 'DynamicZoneComponent',
  } as unknown as DynamicZoneProps;

  const TestComponent = (props?: Partial<DynamicZoneProps>) => (
    <DynamicZone {...defaultProps} {...props} />
  );

  const render = (props?: Partial<DynamicZoneProps>) => ({
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
      // @ts-expect-error – TODO: fix me – testing
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
      // @ts-expect-error – TODO: fix me – testing
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
      // @ts-expect-error – TODO: fix me – testing
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
      // @ts-expect-error – TODO: fix me – testing
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

      expect(addComponentToDynamicZone.mock.calls[0]).toMatchInlineSnapshot(`
        [
          "DynamicZoneComponent",
          {
            "apiID": "",
            "attributes": {},
            "category": "myComponents",
            "info": {
              "displayName": "component1",
              "icon": undefined,
              "pluralName": "component1",
              "singularName": "component1",
            },
            "isDisplayed": false,
            "kind": "singleType",
            "layouts": {
              "edit": [],
            },
            "modelType": "contentType",
          },
          {},
          false,
          undefined,
        ]
      `);
    });

    it('should call the removeComponentFromDynamicZone callback when the RemoveButton is clicked', async () => {
      const removeComponentFromDynamicZone = jest.fn();
      // @ts-expect-error – TODO: fix me – testing
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
      // @ts-expect-error – TODO: fix me – testing
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
          // @ts-expect-error – strings should be string.string
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
      // @ts-expect-error – TODO: fix me – testing
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

      expect(getByText('Press spacebar to grab and re-order')).toBeInTheDocument();
    });

    it('should update the live text when an item has been grabbed', async () => {
      // @ts-expect-error – TODO: fix me – testing
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

      const { getAllByRole, getByText, user } = render();

      const [draggedItem] = getAllByRole('button', { name: 'Drag' });

      act(() => {
        draggedItem.focus();
      });

      await user.keyboard('[Space]');

      expect(
        getByText(/Press up and down arrow to change position, Spacebar to drop, Escape to cancel/)
      ).toBeInTheDocument();
    });

    it('should change the live text when an item has been moved', async () => {
      // @ts-expect-error – TODO: fix me – testing
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

      const { user, getAllByRole, getByText } = render();

      const [draggedItem] = getAllByRole('button', { name: 'Drag' });

      act(() => {
        draggedItem.focus();
      });

      await user.keyboard('[Space]');
      await user.keyboard('[ArrowDown]');

      expect(getByText(/New position in list/)).toBeInTheDocument();
    });

    it('should change the live text when an item has been dropped', async () => {
      // @ts-expect-error – TODO: fix me – testing
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

      const { getAllByRole, user, getByText } = render();

      const [draggedItem] = getAllByRole('button', { name: 'Drag' });

      act(() => {
        draggedItem.focus();
      });

      await user.keyboard('[Space]');
      await user.keyboard('[ArrowDown]');
      await user.keyboard('[Space]');

      expect(getByText(/Final position in list/)).toBeInTheDocument();
    });

    it('should change the live text after the reordering interaction has been cancelled', async () => {
      // @ts-expect-error – TODO: fix me – testing
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

      const { getAllByRole, user, getByText } = render();

      const [draggedItem] = getAllByRole('button', { name: 'Drag' });

      act(() => {
        draggedItem.focus();
      });

      await user.keyboard('[Space]');
      await user.keyboard('[Escape]');

      expect(getByText(/Re-order cancelled/)).toBeInTheDocument();
    });
  });

  describe('Add component button', () => {
    it('should render the close label if the component picker is open prop is true', async () => {
      const { getByRole, user } = render();

      expect(getByRole('button', { name: /Add a component to/i })).toBeInTheDocument();

      await user.click(getByRole('button', { name: /Add a component to/i }));

      expect(getByRole('button', { name: /Close/ })).toBeInTheDocument();
    });

    it('should render the name of the field when the label is an empty string', () => {
      const { getByRole } = render({ metadatas: {} });
      expect(getByRole('button', { name: `Add a component to ${TEST_NAME}` })).toBeInTheDocument();
    });

    it('should render a too high error if there is hasMaxError is true and the component is not open', () => {
      // @ts-expect-error – TODO: fix me – testing
      useCMEditViewDataManager.mockImplementation(() => ({
        ...defaultCMEditViewMock,
        formErrors: {
          [TEST_NAME]: {
            id: 'components.Input.error.validation.max',
          },
        },
      }));
      const { getByRole } = render();
      expect(getByRole('button', { name: /The value is too high./ })).toBeInTheDocument();
    });

    it('should render a label telling the user there are X missing components if hasMinError is true and the component is not open', () => {
      // @ts-expect-error – TODO: fix me – testing
      useCMEditViewDataManager.mockImplementation(() => ({
        ...defaultCMEditViewMock,
        formErrors: {
          [TEST_NAME]: {
            id: 'components.Input.error.validation.min',
          },
        },
      }));
      const { getByRole } = render();
      expect(getByRole('button', { name: /missing components/ })).toBeInTheDocument();
    });
  });
});
