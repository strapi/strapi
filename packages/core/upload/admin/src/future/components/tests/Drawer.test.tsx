import { render, screen, fireEvent } from '@tests/utils';

import { Drawer } from '../Drawer';

const defaultTitle = { id: 'test.title', defaultMessage: 'Test title' };
const defaultDescription = { id: 'test.description', defaultMessage: 'Test description' };

const renderDrawer = (
  props: {
    isVisible?: boolean;
    onClose?: () => void;
    dataTestId?: string;
    isContentExpanded?: boolean;
    title?: { id: string; defaultMessage: string };
    description?: { id: string; defaultMessage: string };
  } = {}
) => {
  const onClose = props.onClose ?? jest.fn();
  return render(
    <Drawer.Root
      isVisible={props.isVisible ?? true}
      onClose={onClose}
      dataTestId={props.dataTestId ?? 'test-drawer'}
      isContentExpanded={props.isContentExpanded}
      title={props.title ?? defaultTitle}
      description={props.description ?? defaultDescription}
    >
      <Drawer.Header>
        <span data-testid="drawer-header">Header content</span>
      </Drawer.Header>
      <Drawer.Content>
        <span data-testid="drawer-content">Body content</span>
      </Drawer.Content>
      <Drawer.Footer>
        <span data-testid="drawer-footer">Footer content</span>
      </Drawer.Footer>
    </Drawer.Root>
  );
};

describe('Drawer', () => {
  describe('Drawer.Root', () => {
    it('renders the drawer when isVisible is true', () => {
      renderDrawer({ isVisible: true });
      expect(screen.getByTestId('test-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('test-drawer')).toHaveAttribute('data-state', 'open');
    });

    it('does not render the drawer in the DOM when isVisible is false', () => {
      renderDrawer({ isVisible: false });
      expect(screen.queryByTestId('test-drawer')).not.toBeInTheDocument();
    });

    it('updates visibility when isVisible changes', () => {
      const { rerender } = renderDrawer({ isVisible: true });
      expect(screen.getByTestId('test-drawer')).toHaveAttribute('data-state', 'open');

      rerender(
        <Drawer.Root
          isVisible={false}
          onClose={jest.fn()}
          dataTestId="test-drawer"
          title={defaultTitle}
          description={defaultDescription}
        >
          <Drawer.Header>
            <span data-testid="drawer-header">Header content</span>
          </Drawer.Header>
          <Drawer.Content>
            <span data-testid="drawer-content">Body content</span>
          </Drawer.Content>
          <Drawer.Footer>
            <span data-testid="drawer-footer">Footer content</span>
          </Drawer.Footer>
        </Drawer.Root>
      );
      expect(screen.queryByTestId('test-drawer')).not.toBeInTheDocument();
    });

    it('applies dataTestId to the container', () => {
      renderDrawer({ dataTestId: 'custom-drawer-id' });
      expect(screen.getByTestId('custom-drawer-id')).toBeInTheDocument();
    });

    it('renders accessible title for screen readers', () => {
      renderDrawer({ title: { id: 'custom.title', defaultMessage: 'Custom title' } });
      expect(screen.getByText('Custom title')).toBeInTheDocument();
    });

    it('renders accessible description when provided', () => {
      renderDrawer({
        description: { id: 'custom.description', defaultMessage: 'Custom description' },
      });
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });
  });

  describe('Drawer.CloseButton', () => {
    it('renders and calls onClose when clicked', () => {
      const onClose = jest.fn();
      render(
        <Drawer.Root
          isVisible
          onClose={onClose}
          dataTestId="test-drawer"
          title={defaultTitle}
          description={defaultDescription}
        >
          <Drawer.Header>
            <Drawer.CloseButton onClose={onClose} />
          </Drawer.Header>
          <Drawer.Content>Content</Drawer.Content>
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
        <Drawer.Root
          isVisible
          onClose={jest.fn()}
          dataTestId="test-drawer"
          isContentExpanded={false}
          title={defaultTitle}
          description={defaultDescription}
        >
          <Drawer.Header>
            <span data-testid="drawer-header">Header content</span>
          </Drawer.Header>
          <Drawer.Content>
            <span data-testid="drawer-content">Body content</span>
          </Drawer.Content>
          <Drawer.Footer>
            <span data-testid="drawer-footer">Footer content</span>
          </Drawer.Footer>
        </Drawer.Root>
      );
      expect(
        screen.getByTestId('drawer-content').closest('[data-collapsed="true"]')
      ).toBeInTheDocument();
    });
  });
});
