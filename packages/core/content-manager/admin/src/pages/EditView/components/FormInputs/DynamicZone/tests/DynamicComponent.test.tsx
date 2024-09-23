import { Form } from '@strapi/admin/strapi-admin';
import { screen, fireEvent, render as renderRTL } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { DynamicComponent, DynamicComponentProps } from '../DynamicComponent';

import { dynamicComponentsByCategory } from './fixtures';

/**
 * We _could_ unmock this and use it, but it requires more
 * harnessing then is necessary and it's not worth it for these
 * tests when really we're focussing on dynamic zone behaviour.
 */
jest.mock('../../../InputRenderer', () => ({
  InputRenderer: () => 'INPUTS',
}));

describe('DynamicComponent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    index: 0,
    componentUid: 'blog.test-como',
    name: 'dynamiczone',
    onAddComponent: jest.fn(),
    onMoveComponent: jest.fn(),
    onRemoveComponentClick: jest.fn(),
    dynamicComponentsByCategory: {
      blog: [
        {
          uid: 'blog.test-como',
          displayName: 'component',
        },
      ],
    },
  } satisfies DynamicComponentProps;

  interface TestComponentProps extends Partial<DynamicComponentProps> {
    testingDnd?: boolean;
  }

  const TestComponent = ({ testingDnd, ...restProps }: TestComponentProps) => (
    <>
      <DynamicComponent {...defaultProps} {...restProps} />
      {testingDnd ? <DynamicComponent {...defaultProps} index={1} {...restProps} /> : null}
    </>
  );

  const render = (props?: TestComponentProps) =>
    renderRTL(<TestComponent {...props} />, {
      renderOptions: {
        wrapper: ({ children }) => (
          <Routes>
            <Route
              path="/content-manager/:collectionType/:slug/:id"
              element={
                <Form
                  initialValues={{
                    dynamiczone: [
                      {
                        name: 'test',
                      },
                    ],
                  }}
                  method="POST"
                  onSubmit={jest.fn()}
                >
                  {children}
                </Form>
              }
            />
          </Routes>
        ),
      },
      initialEntries: ['/content-manager/collectionType/api::address.address/create'],
    });

  it('should by default render the name of the component in the accordion trigger', async () => {
    render();

    await screen.findByRole('button', { name: 'component - test' });
  });

  it('should allow removal of the component & call the onRemoveComponentClick callback when the field isAllowed', async () => {
    const onRemoveComponentClick = jest.fn();
    const { user } = render({ disabled: false, onRemoveComponentClick });

    await screen.findByRole('button', { name: 'component - test' });

    await user.click(screen.getByRole('button', { name: 'Delete - test' }));

    expect(onRemoveComponentClick).toHaveBeenCalled();
  });

  it('should not show you the delete component button if isFieldAllowed is false', async () => {
    render({ disabled: true });

    await screen.findByRole('button', { name: 'component - test' });

    expect(screen.queryByRole('button', { name: 'Delete component1' })).not.toBeInTheDocument();
  });

  it('should hide the field component when you close the accordion', async () => {
    const { user } = render();

    await screen.findByRole('button', { name: 'component - test' });

    expect(screen.queryByText('INPUTS')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'component - test' }));

    expect(await screen.findByText('INPUTS')).toBeInTheDocument();
  });

  describe('Keyboard drag and drop', () => {
    it('should not move with arrow keys if the button is not pressed first', async () => {
      const onMoveComponent = jest.fn();

      render({
        onMoveComponent,
        testingDnd: true,
      });

      await screen.findByRole('button', { name: 'component - test' });

      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(onMoveComponent).not.toBeCalled();
    });

    it('should move with the arrow keys if the button has been activated first', async () => {
      const onMoveComponent = jest.fn();

      render({ onMoveComponent, testingDnd: true });

      await screen.findByRole('button', { name: 'component - test' });

      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(onMoveComponent).toBeCalledWith(1, 0);
    });

    it('should move with the arrow keys if the button has been activated and then not move after the button has been deactivated', async () => {
      const onMoveComponent = jest.fn();

      render({ onMoveComponent, testingDnd: true });

      await screen.findByRole('button', { name: 'component - test' });

      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(onMoveComponent).toBeCalledTimes(1);
    });

    it('should exit drag and drop mode when the escape key is pressed', async () => {
      const onMoveComponent = jest.fn();

      render({ onMoveComponent, testingDnd: true });

      await screen.findByRole('button', { name: 'component - test' });

      const [draggedItem] = screen.getAllByText('Drag');
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'Escape', code: 'Escape' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowUp', code: 'ArrowUp' });
      expect(onMoveComponent).not.toBeCalled();
    });
  });

  describe('adding above and below components', () => {
    it('should render a menu button with two items that have submenus that list the components grouped by categories', async () => {
      const { user } = render({
        dynamicComponentsByCategory: {
          ...dynamicComponentsByCategory,
          seo: [
            {
              uid: 'seo.metadata',
              displayName: 'metadata',
            },
          ],
        },
      });

      await screen.findByRole('button', { name: 'component - test' });

      expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'More actions' }));

      expect(screen.getByRole('menuitem', { name: 'Add component above' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Add component below' })).toBeInTheDocument();

      await user.click(screen.getByRole('menuitem', { name: 'Add component above' }));

      expect(screen.getByText('blog')).toBeInTheDocument();
      expect(screen.getByText('seo')).toBeInTheDocument();

      expect(screen.getByRole('menuitem', { name: 'component' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'metadata' })).toBeInTheDocument();

      await user.click(screen.getByRole('menuitem', { name: 'Add component below' }));

      expect(screen.getByText('blog')).toBeInTheDocument();
      expect(screen.getByText('seo')).toBeInTheDocument();

      expect(screen.getByRole('menuitem', { name: 'component' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'metadata' })).toBeInTheDocument();
    });

    it('should call the onAddComponent callback with the correct index when adding above', async () => {
      const onAddComponent = jest.fn();
      const { user } = render({ dynamicComponentsByCategory, onAddComponent, index: 0 });

      await screen.findByRole('button', { name: 'component - test' });

      await user.click(screen.getByRole('button', { name: 'More actions' }));
      await user.click(screen.getByRole('menuitem', { name: 'Add component above' }));

      /**
       * @note – for some reason, user.click() doesn't work here
       */
      fireEvent.click(screen.getByRole('menuitem', { name: 'component' }));

      expect(onAddComponent).toHaveBeenCalledWith('blog.test-como', 0);
    });

    it('should call the onAddComponent callback with the correct index when adding below', async () => {
      const onAddComponent = jest.fn();
      const { user } = render({ dynamicComponentsByCategory, onAddComponent, index: 0 });

      await screen.findByRole('button', { name: 'component - test' });

      await user.click(screen.getByRole('button', { name: 'More actions' }));
      await user.click(screen.getByRole('menuitem', { name: 'Add component below' }));

      /**
       * @note – for some reason, user.click() doesn't work here
       */
      fireEvent.click(screen.getByRole('menuitem', { name: 'component' }));

      expect(onAddComponent).toHaveBeenCalledWith('blog.test-como', 1);
    });
  });

  /**
   * TODO: re-add this test when errors are reimplemented
   */
  it.skip('should handle errors in the fields', async () => {
    render({
      index: 0,
    });

    await screen.findByRole('button', { name: 'component - test' });

    expect(screen.getByText('The component contains error(s)')).toBeInTheDocument();
  });
});
