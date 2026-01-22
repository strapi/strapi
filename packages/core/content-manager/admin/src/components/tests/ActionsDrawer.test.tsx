import { render, screen, waitFor } from '@tests/utils';

import { ActionsDrawer } from '../ActionsDrawer';

describe('ActionsDrawer', () => {
  const defaultHeaderContent = <div>Header Content</div>;
  const defaultChildren = <div>Drawer Children</div>;

  describe('Rendering', () => {
    it('should render header content', () => {
      render(<ActionsDrawer headerContent={defaultHeaderContent} />);

      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should render children when provided', () => {
      render(<ActionsDrawer headerContent={defaultHeaderContent}>{defaultChildren}</ActionsDrawer>);

      expect(screen.getByText('Drawer Children')).toBeInTheDocument();
    });

    it('should not render toggle button when hasContent is false', () => {
      render(
        <ActionsDrawer headerContent={defaultHeaderContent} hasContent={false}>
          {defaultChildren}
        </ActionsDrawer>
      );

      expect(screen.queryByRole('button', { name: /open|close/i })).not.toBeInTheDocument();
    });

    it('should not render toggle button when children are not provided', () => {
      render(<ActionsDrawer headerContent={defaultHeaderContent} hasContent={true} />);

      expect(screen.queryByRole('button', { name: /open|close/i })).not.toBeInTheDocument();
    });

    it('should render toggle button when hasContent is true and children are provided', () => {
      render(
        <ActionsDrawer headerContent={defaultHeaderContent} hasContent={true}>
          {defaultChildren}
        </ActionsDrawer>
      );

      expect(screen.getByRole('button', { name: 'Open more actions' })).toBeInTheDocument();
    });
  });

  describe('Toggle functionality', () => {
    it('should open drawer when toggle button is clicked', async () => {
      const { user } = render(
        <ActionsDrawer headerContent={defaultHeaderContent} hasContent={true}>
          {defaultChildren}
        </ActionsDrawer>
      );

      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });
    });

    it('should close drawer when toggle button is clicked again', async () => {
      const { user } = render(
        <ActionsDrawer headerContent={defaultHeaderContent} hasContent={true}>
          {defaultChildren}
        </ActionsDrawer>
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
        <ActionsDrawer headerContent={defaultHeaderContent} hasContent={true}>
          {defaultChildren}
        </ActionsDrawer>
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
        <ActionsDrawer headerContent={defaultHeaderContent} hasContent={true}>
          {defaultChildren}
        </ActionsDrawer>
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

  describe('hasContent prop', () => {
    it('should close drawer when hasContent changes from true to false', async () => {
      const { user, rerender } = render(
        <ActionsDrawer headerContent={defaultHeaderContent} hasContent={true}>
          {defaultChildren}
        </ActionsDrawer>
      );

      // Open the drawer
      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });

      // Change hasContent to false
      rerender(
        <ActionsDrawer headerContent={defaultHeaderContent} hasContent={false}>
          {defaultChildren}
        </ActionsDrawer>
      );

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: 'Close more actions' })
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have visually hidden text for toggle button', () => {
      render(
        <ActionsDrawer headerContent={defaultHeaderContent} hasContent={true}>
          {defaultChildren}
        </ActionsDrawer>
      );

      expect(screen.getByText('Open more actions')).toBeInTheDocument();
    });

    it('should update visually hidden text when drawer is toggled', async () => {
      const { user } = render(
        <ActionsDrawer headerContent={defaultHeaderContent} hasContent={true}>
          {defaultChildren}
        </ActionsDrawer>
      );

      expect(screen.getByText('Open more actions')).toBeInTheDocument();

      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Close more actions')).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty children gracefully', () => {
      render(<ActionsDrawer headerContent={defaultHeaderContent}>{null}</ActionsDrawer>);

      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should handle multiple children', () => {
      render(
        <ActionsDrawer headerContent={defaultHeaderContent}>
          <div>Child 1</div>
          <div>Child 2</div>
        </ActionsDrawer>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });

    it('should maintain state when headerContent changes', async () => {
      const { user, rerender } = render(
        <ActionsDrawer headerContent={<div>Header 1</div>} hasContent={true}>
          {defaultChildren}
        </ActionsDrawer>
      );

      // Open the drawer
      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });

      // Change headerContent
      rerender(
        <ActionsDrawer headerContent={<div>Header 2</div>} hasContent={true}>
          {defaultChildren}
        </ActionsDrawer>
      );

      // Drawer should still be open
      expect(screen.getByText('Header 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
    });
  });
});
