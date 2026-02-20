import * as Dialog from '@radix-ui/react-dialog';
import { render, screen, fireEvent } from '@tests/utils';

import { Drawer } from '../Drawer';

const renderDrawer = (
  props: {
    isVisible?: boolean;
    onClose?: () => void;
    isContentExpanded?: boolean;
    title?: string;
    description?: string;
  } = {}
) => {
  const onClose = props.onClose ?? jest.fn();
  return render(
    <Drawer.Root isVisible={props.isVisible ?? true} onClose={onClose}>
      <Drawer.Body>
        <Dialog.Title>{props.title ?? 'Test title'}</Dialog.Title>
        <Dialog.Description>{props.description ?? 'Test description'}</Dialog.Description>
        <span data-testid="drawer-header">Header content</span>
        <Drawer.ScrollableContent isContentExpanded={props.isContentExpanded}>
          <span data-testid="drawer-content">Body content</span>
        </Drawer.ScrollableContent>
        <span data-testid="drawer-footer">Footer content</span>
      </Drawer.Body>
    </Drawer.Root>
  );
};

describe('Drawer', () => {
  describe('Drawer.Root', () => {
    it('renders the drawer when isVisible is true', () => {
      renderDrawer({ isVisible: true });
      const dialog = screen.getByRole('dialog', { name: 'Test title' });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('data-state', 'open');
    });

    it('does not render the drawer in the DOM when isVisible is false', () => {
      renderDrawer({ isVisible: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('updates visibility when isVisible changes', () => {
      const { rerender } = renderDrawer({ isVisible: true });
      expect(screen.getByRole('dialog', { name: 'Test title' })).toHaveAttribute(
        'data-state',
        'open'
      );

      rerender(
        <Drawer.Root isVisible={false} onClose={jest.fn()}>
          <Drawer.Body>
            <Dialog.Title>Test title</Dialog.Title>
            <Dialog.Description>Test description</Dialog.Description>
            <span data-testid="drawer-header">Header content</span>
            <Drawer.ScrollableContent>
              <span data-testid="drawer-content">Body content</span>
            </Drawer.ScrollableContent>
            <span data-testid="drawer-footer">Footer content</span>
          </Drawer.Body>
        </Drawer.Root>
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders accessible title from content', () => {
      renderDrawer({ title: 'Custom title' });
      expect(screen.getByText('Custom title')).toBeInTheDocument();
    });

    it('renders accessible description from content when provided', () => {
      renderDrawer({ description: 'Custom description' });
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });
  });

  describe('Drawer.Body', () => {
    it('applies width, height, and maxHeight parameters', () => {
      render(
        <Drawer.Root isVisible onClose={jest.fn()}>
          <Drawer.Body width={500} height={300} maxHeight={400}>
            <Dialog.Title>Test title</Dialog.Title>
            <Dialog.Description>Test description</Dialog.Description>
            <Drawer.ScrollableContent>Content</Drawer.ScrollableContent>
          </Drawer.Body>
        </Drawer.Root>
      );

      const dialog = screen.getByRole('dialog', { name: 'Test title' });
      const styles = window.getComputedStyle(dialog);

      expect(styles.width).toBe('500px');
      expect(styles.height).toBe('300px');
      expect(styles.maxHeight).toBe('400px');
    });

    it('applies string values for width and maxHeight', () => {
      render(
        <Drawer.Root isVisible onClose={jest.fn()}>
          <Drawer.Body width="41.6rem" maxHeight="34.2rem">
            <Dialog.Title>Test title</Dialog.Title>
            <Dialog.Description>Test description</Dialog.Description>
            <Drawer.ScrollableContent>Content</Drawer.ScrollableContent>
          </Drawer.Body>
        </Drawer.Root>
      );

      const dialog = screen.getByRole('dialog', { name: 'Test title' });
      const styles = window.getComputedStyle(dialog);

      expect(styles.width).toBe('41.6rem');
      expect(styles.maxHeight).toBe('34.2rem');
    });

    it('applies animationDirection parameter', () => {
      const { rerender } = render(
        <Drawer.Root isVisible onClose={jest.fn()}>
          <Drawer.Body animationDirection="up">
            <Dialog.Title>Test title</Dialog.Title>
            <Dialog.Description>Test description</Dialog.Description>
            <Drawer.ScrollableContent>Content</Drawer.ScrollableContent>
          </Drawer.Body>
        </Drawer.Root>
      );

      const dialog = screen.getByRole('dialog', { name: 'Test title' });
      expect(dialog).toHaveAttribute('data-animation-direction', 'up');

      rerender(
        <Drawer.Root isVisible onClose={jest.fn()}>
          <Drawer.Body animationDirection="left">
            <Dialog.Title>Test title</Dialog.Title>
            <Dialog.Description>Test description</Dialog.Description>
            <Drawer.ScrollableContent>Content</Drawer.ScrollableContent>
          </Drawer.Body>
        </Drawer.Root>
      );

      expect(dialog).toHaveAttribute('data-animation-direction', 'left');
    });
  });

  describe('Drawer.CloseButton', () => {
    it('renders and calls onClose when clicked', () => {
      const onClose = jest.fn();
      render(
        <Drawer.Root isVisible onClose={onClose}>
          <Drawer.Body>
            <Dialog.Title>Test title</Dialog.Title>
            <Dialog.Description>Test description</Dialog.Description>
            <Drawer.CloseButton onClose={onClose} />
            <Drawer.ScrollableContent>Content</Drawer.ScrollableContent>
          </Drawer.Body>
        </Drawer.Root>
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Drawer.Content with isContentExpanded', () => {
    it('renders content when isContentExpanded is true', () => {
      renderDrawer({ isContentExpanded: true });
      expect(screen.getByTestId('drawer-content')).toBeInTheDocument();
      expect(
        screen.queryByTestId('drawer-content')?.closest('[data-collapsed="true"]')
      ).not.toBeInTheDocument();
    });

    it('collapses content when isContentExpanded is false', () => {
      renderDrawer({ isContentExpanded: false });
      expect(screen.getByTestId('drawer-content')).toBeInTheDocument();
      expect(
        screen.getByTestId('drawer-content').closest('[data-collapsed="true"]')
      ).toBeInTheDocument();
    });

    it('updates visibility when isContentExpanded changes', () => {
      const { rerender } = renderDrawer({ isContentExpanded: true });
      expect(
        screen.queryByTestId('drawer-content')?.closest('[data-collapsed="true"]')
      ).not.toBeInTheDocument();

      rerender(
        <Drawer.Root isVisible onClose={jest.fn()}>
          <Drawer.Body>
            <Dialog.Title>Test title</Dialog.Title>
            <Dialog.Description>Test description</Dialog.Description>
            <span data-testid="drawer-header">Header content</span>
            <Drawer.ScrollableContent isContentExpanded={false}>
              <span data-testid="drawer-content">Body content</span>
            </Drawer.ScrollableContent>
            <span data-testid="drawer-footer">Footer content</span>
          </Drawer.Body>
        </Drawer.Root>
      );
      expect(
        screen.getByTestId('drawer-content').closest('[data-collapsed="true"]')
      ).toBeInTheDocument();
    });
  });
});
