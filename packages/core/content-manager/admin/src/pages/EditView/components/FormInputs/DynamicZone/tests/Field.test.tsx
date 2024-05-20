import { Form } from '@strapi/admin/strapi-admin';
import { act, render as renderRTL, screen, waitFor } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { DynamicZone, DynamicZoneProps } from '../Field';

const TEST_NAME = 'DynamicZoneComponent';

/**
 * We _could_ unmock this and use it, but it requires more
 * harnessing then is necessary and it's not worth it for these
 * tests when really we're focussing on dynamic zone behaviour.
 */
jest.mock('../../../InputRenderer', () => ({
  InputRenderer: () => 'INPUTS',
}));

describe('DynamicZone', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    attribute: {
      type: 'dynamiczone',
      components: ['blog.test-como', 'seo.metadata'],
    },
    disabled: false,
    hint: 'dynamic description',
    label: 'dynamic zone',
    name: 'DynamicZoneComponent',
    type: 'dynamiczone',
  } satisfies DynamicZoneProps;

  const render = ({
    initialFormValues = {},
    ...props
  }: Partial<DynamicZoneProps> & { initialFormValues?: object } = {}) => ({
    ...renderRTL(<DynamicZone {...defaultProps} {...props} />, {
      renderOptions: {
        wrapper: ({ children }) => (
          <Routes>
            <Route
              path="/content-manager/:collectionType/:slug/:id"
              element={
                <Form initialValues={initialFormValues} method="POST" onSubmit={jest.fn()}>
                  {children}
                </Form>
              }
            />
          </Routes>
        ),
      },
      initialEntries: ['/content-manager/collectionType/api::address.address/create'],
    }),
  });

  const waitForQueryToFinish = async () => {
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Add a component to/i })).toBeEnabled()
    );
  };

  describe('rendering', () => {
    it('should not render the dynamic zone if there are no dynamic components to render', async () => {
      render();

      await waitForQueryToFinish();

      expect(screen.queryByText('dynamic zone')).not.toBeInTheDocument();
      expect(screen.queryByText('dynamic description')).not.toBeInTheDocument();
    });

    it('should render the AddComponentButton by default and render the ComponentPicker when that button is clicked', async () => {
      const { user } = render();

      await waitForQueryToFinish();

      const addComponentButton = screen.getByRole('button', { name: /Add a component to/i });

      expect(addComponentButton).toBeInTheDocument();

      await user.click(addComponentButton);

      expect(screen.getByText('Pick one component')).toBeInTheDocument();
    });

    it('should render the dynamic zone of components when there are dynamic components to render', async () => {
      render({
        initialFormValues: {
          DynamicZoneComponent: [
            {
              __temp_key__: '0',
              __component: 'blog.test-como',
              name: 'test',
            },
          ],
        },
      });

      await waitForQueryToFinish();

      expect(screen.getByText('dynamic zone')).toBeInTheDocument();
      expect(screen.getByText('dynamic description')).toBeInTheDocument();

      expect(screen.getByText('test comp - test')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call the addComponentToDynamicZone callback when the AddComponentButton is clicked', async () => {
      const { user } = render();

      await waitForQueryToFinish();

      await user.click(screen.getByRole('button', { name: /Add a component to/i }));
      await user.click(
        screen.getByRole('button', {
          name: 'test comp',
        })
      );

      expect(screen.getByText('test comp - toto')).toBeInTheDocument();
    });

    it('should call the removeComponentFromDynamicZone callback when the RemoveButton is clicked', async () => {
      const { user } = render({
        initialFormValues: {
          DynamicZoneComponent: [
            {
              __temp_key__: '0',
              __component: 'blog.test-como',
              name: 'test',
            },
          ],
        },
      });

      await waitForQueryToFinish();

      await user.click(screen.getByRole('button', { name: 'Delete - test' }));

      expect(screen.queryByText(/test comp/)).not.toBeInTheDocument();
    });
  });

  describe('side effects', () => {
    /**
     * TODO: re-add this test when errors are reimplemented
     */
    it.skip('should call the toggleNotification callback if the amount of dynamic components has hit its max and the user tries to add another', async () => {
      const { user, getByRole } = render({
        attribute: {
          ...defaultProps.attribute,
          max: 3,
        },
      });

      const addComponentButton = getByRole('button', { name: /Add a component to/i });

      await user.click(addComponentButton);

      await screen.findByText('Warning:');
    });
  });

  describe('Accessibility', () => {
    it('should have have description text', async () => {
      render({
        initialFormValues: {
          DynamicZoneComponent: [
            {
              __temp_key__: '0',
              __component: 'blog.test-como',
              name: 'test',
            },
          ],
        },
      });

      await waitForQueryToFinish();

      expect(screen.getByText('Press spacebar to grab and re-order')).toBeInTheDocument();
    });

    it('should update the live text when an item has been grabbed', async () => {
      const { user } = render({
        initialFormValues: {
          DynamicZoneComponent: [
            {
              __temp_key__: '0',
              __component: 'blog.test-como',
              name: 'test',
            },
          ],
        },
      });

      await waitForQueryToFinish();

      const [draggedItem] = screen.getAllByRole('button', { name: 'Drag' });

      act(() => {
        draggedItem.focus();
      });

      await user.keyboard('[Space]');

      expect(
        screen.getByText(
          /Press up and down arrow to change position, Spacebar to drop, Escape to cancel/
        )
      ).toBeInTheDocument();
    });

    it('should change the live text when an item has been moved', async () => {
      const { user } = render({
        initialFormValues: {
          DynamicZoneComponent: [
            {
              __temp_key__: '0',
              __component: 'blog.test-como',
              name: 'test',
            },
          ],
        },
      });

      await waitForQueryToFinish();

      const [draggedItem] = screen.getAllByRole('button', { name: 'Drag' });

      act(() => {
        draggedItem.focus();
      });

      await user.keyboard('[Space]');
      await user.keyboard('[ArrowDown]');

      expect(screen.getByText(/New position in list/)).toBeInTheDocument();
    });

    it('should change the live text when an item has been dropped', async () => {
      const { user } = render({
        initialFormValues: {
          DynamicZoneComponent: [
            {
              __temp_key__: 'a0',
              __component: 'blog.test-como',
              name: 'test',
            },
            {
              __temp_key__: 'a5',
              __component: 'blog.test-como',
              name: 'other',
            },
          ],
        },
      });

      await waitForQueryToFinish();

      const [draggedItem] = screen.getAllByRole('button', { name: 'Drag' });

      act(() => {
        draggedItem.focus();
      });

      await user.keyboard('[Space]');
      await user.keyboard('[ArrowDown]');
      await user.keyboard('[Space]');

      expect(screen.getByText(/New position in list/)).toBeInTheDocument();
    });

    it('should change the live text after the reordering interaction has been cancelled', async () => {
      const { user } = render({
        initialFormValues: {
          DynamicZoneComponent: [
            {
              __temp_key__: '0',
              __component: 'blog.test-como',
              name: 'test',
            },
          ],
        },
      });

      await waitForQueryToFinish();

      const [draggedItem] = screen.getAllByRole('button', { name: 'Drag' });

      act(() => {
        draggedItem.focus();
      });

      await user.keyboard('[Space]');
      await user.keyboard('[Escape]');

      expect(screen.getByText(/Re-order cancelled/)).toBeInTheDocument();
    });
  });

  describe.skip('Add component button', () => {
    it('should render the close label if the component picker is open prop is true', async () => {
      const { user } = render();

      await waitForQueryToFinish();

      expect(screen.getByRole('button', { name: /Add a component to/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Add a component to/i }));

      expect(screen.getByRole('button', { name: /Close/ })).toBeInTheDocument();
    });

    it('should render the name of the field when the label is an empty string', async () => {
      render({ label: '' });

      await waitForQueryToFinish();

      expect(
        screen.getByRole('button', { name: `Add a component to ${TEST_NAME}` })
      ).toBeInTheDocument();
    });

    /**
     * TODO: re-add this test when errors are reimplemented
     */
    it.skip('should render a too high error if there is hasMaxError is true and the component is not open', async () => {
      render();

      await waitForQueryToFinish();

      expect(screen.getByRole('button', { name: /The value is too high./ })).toBeInTheDocument();
    });

    /**
     * TODO: re-add this test when errors are reimplemented
     */
    it.skip('should render a label telling the user there are X missing components if hasMinError is true and the component is not open', async () => {
      render();

      await waitForQueryToFinish();

      expect(screen.getByRole('button', { name: /missing components/ })).toBeInTheDocument();
    });
  });
});
