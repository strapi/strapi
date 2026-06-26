import { render, screen, waitFor } from '@tests/utils';

import { ActionsDrawer } from '../ActionsDrawer';

describe('ActionsDrawer', () => {
  const defaultHeaderContent = <div>Header Content</div>;
  const defaultDrawerContent = <div>Drawer Children</div>;

  describe('Rendering', () => {
    it('should render header content', () => {
      render(
        <ActionsDrawer.Root hasContent={false}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
        </ActionsDrawer.Root>
      );

      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should render drawer content when provided', () => {
      render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      expect(screen.getByText('Drawer Children')).toBeInTheDocument();
    });

    it('should not render toggle button when hasContent is false', () => {
      render(
        <ActionsDrawer.Root hasContent={false}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      expect(screen.queryByRole('button', { name: /open|close/i })).not.toBeInTheDocument();
    });

    it('should render toggle button when hasContent is true', () => {
      render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      expect(screen.getByRole('button', { name: 'Open more actions' })).toBeInTheDocument();
    });

    it('should render overlay when hasContent is true', () => {
      render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Overlay />
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      expect(screen.getByTestId('actions-drawer-overlay')).toBeInTheDocument();
    });

    it('should not render overlay when hasContent is false', () => {
      render(
        <ActionsDrawer.Root hasContent={false}>
          <ActionsDrawer.Overlay />
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
        </ActionsDrawer.Root>
      );

      expect(screen.queryByTestId('actions-drawer-overlay')).not.toBeInTheDocument();
    });
  });

  describe('Toggle functionality', () => {
    it('should open drawer when toggle button is clicked', async () => {
      const { user } = render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });
    });

    it('should close drawer when toggle button is clicked again', async () => {
      const { user } = render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: 'Close more actions' });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Open more actions' })).toBeInTheDocument();
      });
    });

    it('should show drawer content when opened', async () => {
      const { user } = render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Drawer Children')).toBeVisible();
      });
    });
  });

  describe('Overlay click', () => {
    it('should close drawer when overlay is clicked', async () => {
      const { user } = render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Overlay />
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      // Open the drawer first
      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });

      const overlay = screen.getByTestId('actions-drawer-overlay');
      await user.click(overlay);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Open more actions' })).toBeInTheDocument();
      });
    });
  });

  describe('hasContent prop changes', () => {
    it('should close drawer and hide toggle button when hasContent becomes false', async () => {
      const { user, rerender } = render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      // Open the drawer
      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });

      // Change hasContent to false
      rerender(
        <ActionsDrawer.Root hasContent={false}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /open|close/i })).not.toBeInTheDocument();
      });
    });

    it('should show toggle button when hasContent is true', () => {
      render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      expect(screen.getByRole('button', { name: 'Open more actions' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label for toggle button', () => {
      render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      expect(screen.getByRole('button', { name: 'Open more actions' })).toBeInTheDocument();
    });

    it('should update accessible label when drawer is toggled', async () => {
      const { user } = render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      expect(screen.getByRole('button', { name: 'Open more actions' })).toBeInTheDocument();

      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty header content gracefully', () => {
      render(
        <ActionsDrawer.Root hasContent={false}>
          <ActionsDrawer.Header>{null}</ActionsDrawer.Header>
        </ActionsDrawer.Root>
      );

      expect(screen.queryByRole('button', { name: /open|close/i })).not.toBeInTheDocument();
    });

    it('should handle multiple children in content', () => {
      render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>
            <div>Child 1</div>
            <div>Child 2</div>
          </ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });

    it('should maintain drawer state when content changes', async () => {
      const { user, rerender } = render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      // Open the drawer
      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });

      // Change content
      const newContent = <div>New Drawer Children</div>;
      rerender(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{newContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      // Drawer should still be open
      expect(screen.getByText('New Drawer Children')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
    });
  });

  describe('hasSideNav prop', () => {
    it('should accept hasSideNav prop for positioning', () => {
      const { container } = render(
        <ActionsDrawer.Root hasContent={true} hasSideNav={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      expect(container).toBeInTheDocument();
    });

    it('should work without hasSideNav prop', () => {
      const { container } = render(
        <ActionsDrawer.Root hasContent={true}>
          <ActionsDrawer.Header>{defaultHeaderContent}</ActionsDrawer.Header>
          <ActionsDrawer.Content>{defaultDrawerContent}</ActionsDrawer.Content>
        </ActionsDrawer.Root>
      );

      expect(container).toBeInTheDocument();
    });
  });
});
