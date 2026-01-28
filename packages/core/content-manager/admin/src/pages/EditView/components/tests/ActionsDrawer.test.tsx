import { render, screen, waitFor } from '@tests/utils';

import { ActionsDrawer } from '../ActionsDrawer';

let mockPanelsState: { visiblePanels: string[]; setVisiblePanels: jest.Mock } = {
  visiblePanels: [],
  setVisiblePanels: jest.fn(),
};

jest.mock('../Panels', () => ({
  usePanelsContext: jest.fn((_name, selector) => {
    return selector(mockPanelsState);
  }),
  ActionsPanelContent: () => <div>Actions Panel Content</div>,
}));

describe('ActionsDrawer', () => {
  const defaultChildren = <div>Drawer Children</div>;

  beforeEach(() => {
    mockPanelsState = { visiblePanels: [], setVisiblePanels: jest.fn() };
  });

  describe('Rendering', () => {
    it('should render ActionsPanelContent', () => {
      render(<ActionsDrawer />);

      expect(screen.getByText('Actions Panel Content')).toBeInTheDocument();
    });

    it('should render children when provided', () => {
      render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      expect(screen.getByText('Drawer Children')).toBeInTheDocument();
    });

    it('should not render toggle button when visiblePanels is empty', () => {
      mockPanelsState.visiblePanels = [];
      render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      expect(screen.queryByRole('button', { name: /open|close/i })).not.toBeInTheDocument();
    });

    it('should not render toggle button when children are not provided', () => {
      mockPanelsState.visiblePanels = ['panel1'];
      render(<ActionsDrawer />);

      expect(screen.queryByRole('button', { name: /open|close/i })).not.toBeInTheDocument();
    });

    it('should render toggle button when visiblePanels has items and children are provided', () => {
      mockPanelsState.visiblePanels = ['panel1'];
      render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      expect(screen.getByRole('button', { name: 'Open more actions' })).toBeInTheDocument();
    });
  });

  describe('Toggle functionality', () => {
    beforeEach(() => {
      mockPanelsState.visiblePanels = ['panel1'];
    });

    it('should open drawer when toggle button is clicked', async () => {
      const { user } = render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });
    });

    it('should close drawer when toggle button is clicked again', async () => {
      const { user } = render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

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
      const { user } = render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Drawer Children')).toBeVisible();
      });
    });
  });

  describe('Overlay click', () => {
    beforeEach(() => {
      mockPanelsState.visiblePanels = ['panel1'];
    });

    it('should close drawer when overlay is clicked', async () => {
      const { user } = render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

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

  describe('hasContent based on visiblePanels', () => {
    it('should hide toggle button when visiblePanels becomes empty', async () => {
      mockPanelsState.visiblePanels = ['panel1'];
      const { user, rerender } = render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      // Open the drawer
      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });

      // Change visiblePanels to empty
      mockPanelsState.visiblePanels = [];
      rerender(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /open|close/i })).not.toBeInTheDocument();
      });
    });

    it('should show toggle button when visiblePanels has items', () => {
      mockPanelsState.visiblePanels = ['panel1', 'panel2'];
      render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      expect(screen.getByRole('button', { name: 'Open more actions' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockPanelsState.visiblePanels = ['panel1'];
    });

    it('should have visually hidden text for toggle button', () => {
      render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      expect(screen.getByText('Open more actions')).toBeInTheDocument();
    });

    it('should update visually hidden text when drawer is toggled', async () => {
      const { user } = render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

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
      render(<ActionsDrawer>{null}</ActionsDrawer>);

      expect(screen.getByText('Actions Panel Content')).toBeInTheDocument();
    });

    it('should handle multiple children', () => {
      render(
        <ActionsDrawer>
          <div>Child 1</div>
          <div>Child 2</div>
        </ActionsDrawer>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });

    it('should maintain drawer state when children change', async () => {
      mockPanelsState.visiblePanels = ['panel1'];
      const { user, rerender } = render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      // Open the drawer
      const toggleButton = screen.getByRole('button', { name: 'Open more actions' });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
      });

      // Change children
      const newChildren = <div>New Drawer Children</div>;
      rerender(<ActionsDrawer>{newChildren}</ActionsDrawer>);

      // Drawer should still be open
      expect(screen.getByText('New Drawer Children')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close more actions' })).toBeInTheDocument();
    });
  });

  describe('hasSideNav prop', () => {
    it('should accept hasSideNav prop for positioning', () => {
      mockPanelsState.visiblePanels = ['panel1'];
      const { container } = render(
        <ActionsDrawer hasSideNav={true}>{defaultChildren}</ActionsDrawer>
      );

      expect(container).toBeInTheDocument();
    });

    it('should work without hasSideNav prop', () => {
      mockPanelsState.visiblePanels = ['panel1'];
      const { container } = render(<ActionsDrawer>{defaultChildren}</ActionsDrawer>);

      expect(container).toBeInTheDocument();
    });
  });
});
