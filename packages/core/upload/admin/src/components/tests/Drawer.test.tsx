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

    // The panel is full-bleed on mobile and only takes `width` from the medium
    // breakpoint up. Asserting the compiled rules because this is CSS-only —
    // nothing else would notice the media query going missing.
    it('is full width on mobile and takes the given width from medium up', () => {
      render(
        <Drawer.Root isVisible onClose={jest.fn()}>
          <Drawer.Body width="41.6rem">
            <Dialog.Title>Test title</Dialog.Title>
            <Dialog.Description>Test description</Dialog.Description>
            <Drawer.ScrollableContent>Content</Drawer.ScrollableContent>
          </Drawer.Body>
        </Drawer.Root>
      );

      // Read the compiled CSS rather than using toHaveStyleRule: its `media`
      // option can't parse the DS breakpoint, which is emitted as
      // `@media(min-width: 768px)` with no space.
      const css = Array.from(document.querySelectorAll('style'))
        .map((style) => style.textContent ?? '')
        .join('\n');
      const mediumIndex = css.indexOf('@media(min-width: 768px)');

      expect(mediumIndex).toBeGreaterThan(-1);
      // The invariant: the fixed width is scoped to desktop. Absent before the
      // breakpoint (so mobile keeps the full-bleed 100%), present after it.
      expect(css.slice(0, mediumIndex)).not.toContain('41.6rem');
      expect(css.slice(mediumIndex)).toContain('41.6rem');
    });
  });

  // Dismiss-on-outside-click is opt-in and the handler can veto it; focus
  // leaving the panel never closes it (the drawer is non-modal).
  describe('outside interaction', () => {
    const renderWithOutside = ({
      onClose,
      onPointerDownOutside,
    }: {
      onClose: jest.Mock;
      onPointerDownOutside?: (event: Event) => void;
    }) =>
      render(
        <>
          <button type="button" data-testid="outside">
            Outside
          </button>
          <Drawer.Root isVisible onClose={onClose}>
            <Drawer.Body onPointerDownOutside={onPointerDownOutside}>
              <Dialog.Title>Test title</Dialog.Title>
              <Dialog.Description>Test description</Dialog.Description>
              <Drawer.ScrollableContent>
                <button type="button" data-testid="inside">
                  Inside
                </button>
                {/* Rendered from inside the panel, portaled outside it — like a DS dialog. */}
                <Dialog.Root modal={false}>
                  <Dialog.Trigger data-testid="portal-trigger">Open portal</Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Content>
                      <Dialog.Title>Portaled</Dialog.Title>
                      <button type="button" data-testid="portal-inside">
                        Portaled button
                      </button>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </Drawer.ScrollableContent>
            </Drawer.Body>
          </Drawer.Root>
        </>
      );

    it('does not close on an outside pointer press by default', async () => {
      const onClose = jest.fn();
      const { user } = renderWithOutside({ onClose });

      await user.click(screen.getByTestId('outside'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes on an outside pointer press once the consumer opts in', async () => {
      const onClose = jest.fn();
      const { user } = renderWithOutside({ onClose, onPointerDownOutside: () => {} });

      await user.click(screen.getByTestId('outside'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stays open when the handler prevents the default', async () => {
      const onClose = jest.fn();
      const { user } = renderWithOutside({
        onClose,
        onPointerDownOutside: (event) => event.preventDefault(),
      });

      await user.click(screen.getByTestId('outside'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not close on a pointer press inside the panel', async () => {
      const onClose = jest.fn();
      const { user } = renderWithOutside({ onClose, onPointerDownOutside: () => {} });

      await user.click(screen.getByTestId('inside'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not close on a pointer press inside content portaled out of the panel', async () => {
      const onClose = jest.fn();
      const { user } = renderWithOutside({ onClose, onPointerDownOutside: () => {} });

      await user.click(screen.getByTestId('portal-trigger'));
      await user.click(await screen.findByTestId('portal-inside'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not close when focus moves outside the panel', async () => {
      const onClose = jest.fn();
      renderWithOutside({ onClose, onPointerDownOutside: () => {} });

      fireEvent.focusIn(screen.getByTestId('outside'));

      expect(onClose).not.toHaveBeenCalled();
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
