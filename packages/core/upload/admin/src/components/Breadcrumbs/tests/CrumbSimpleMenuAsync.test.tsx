import { render, screen, waitFor } from '@tests/utils';
import { useNavigate } from 'react-router-dom';

import { useFolderStructure } from '../../../hooks/useFolderStructure';
import { CrumbSimpleMenuAsync } from '../CrumbSimpleMenuAsync';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: jest.fn(() => ({ pathname: '/plugins/upload' })),
}));

jest.mock('../../../hooks/useFolderStructure');

const mockUseFolderStructure = useFolderStructure as jest.MockedFunction<typeof useFolderStructure>;
const mockNavigate = jest.fn();

const mockFolderData = [
  {
    value: 1,
    label: 'Folder 1',
    path: '/1',
    children: [
      {
        value: 2,
        label: 'Folder 2',
        path: '/1/2',
        children: [
          {
            value: 3,
            label: 'Folder 3',
            path: '/1/2/3',
            children: [],
          },
        ],
      },
    ],
  },
];

describe('CrumbSimpleMenuAsync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  it('should render the menu trigger', () => {
    mockUseFolderStructure.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    render(<CrumbSimpleMenuAsync currentFolderId={3} />);

    expect(
      screen.getByRole('button', { name: /get more ascendants folders/i })
    ).toBeInTheDocument();
  });

  it('should show loading state when fetching folders', async () => {
    mockUseFolderStructure.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { user } = render(<CrumbSimpleMenuAsync currentFolderId={3} />);

    // Open the menu
    await user.click(screen.getByRole('button', { name: /get more ascendants folders/i }));

    await waitFor(() => {
      expect(screen.getByText(/content is loading/i)).toBeInTheDocument();
    });
  });

  it('should display parent folders when data is loaded', async () => {
    mockUseFolderStructure.mockReturnValue({
      data: mockFolderData as any,
      isLoading: false,
      error: null,
    });

    const { user } = render(<CrumbSimpleMenuAsync currentFolderId={3} />);

    // Open the menu
    await user.click(screen.getByRole('button', { name: /get more ascendants folders/i }));

    await waitFor(() => {
      expect(screen.getByText('Folder 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Folder 2')).toBeInTheDocument();
  });

  it('should filter out omitted parents', async () => {
    mockUseFolderStructure.mockReturnValue({
      data: mockFolderData as any,
      isLoading: false,
      error: null,
    });

    const { user } = render(<CrumbSimpleMenuAsync currentFolderId={3} parentsToOmit={[1]} />);

    // Open the menu
    await user.click(screen.getByRole('button', { name: /get more ascendants folders/i }));

    await waitFor(() => expect(screen.queryByText('Folder 1')).not.toBeInTheDocument());
    expect(screen.getByText('Folder 2')).toBeInTheDocument();
  });

  it('should have the correct url in the menu links', async () => {
    mockUseFolderStructure.mockReturnValue({
      data: mockFolderData as any,
      isLoading: false,
      error: null,
    });

    const { user } = render(<CrumbSimpleMenuAsync currentFolderId={3} />);

    // Open the menu
    await user.click(screen.getByRole('button', { name: /get more ascendants folders/i }));

    // Check the link URL
    await user.click(screen.getByRole('menuitem', { name: 'Folder 1' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('folder=1&folderPath=/1'));
    });
  });

  it('should call onChangeFolder callback when provided', async () => {
    mockUseFolderStructure.mockReturnValue({
      data: mockFolderData as any,
      isLoading: false,
      error: null,
    });

    const onChangeFolder = jest.fn();
    const { user } = render(
      <CrumbSimpleMenuAsync currentFolderId={3} onChangeFolder={onChangeFolder} />
    );

    // Open the menu
    await user.click(screen.getByRole('button', { name: /get more ascendants folders/i }));

    // Click on a folder
    await user.click(screen.getByText('Folder 1'));

    await waitFor(() => {
      expect(onChangeFolder).toHaveBeenCalledWith(1, '/1');
    });
  });

  it('should not fetch data until menu is opened', () => {
    mockUseFolderStructure.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    render(<CrumbSimpleMenuAsync currentFolderId={3} />);

    expect(mockUseFolderStructure).toHaveBeenCalledWith({ enabled: false });
  });

  it('should fetch data when menu is opened', async () => {
    mockUseFolderStructure.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { user } = render(<CrumbSimpleMenuAsync currentFolderId={3} />);

    // Open the menu
    await user.click(screen.getByRole('button', { name: /get more ascendants folders/i }));

    await waitFor(() => {
      expect(mockUseFolderStructure).toHaveBeenCalledWith({ enabled: true });
    });
  });

  it('should handle empty folder structure', async () => {
    mockUseFolderStructure.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    const { user } = render(<CrumbSimpleMenuAsync currentFolderId={3} />);

    // Open the menu
    await user.click(screen.getByRole('button', { name: /get more ascendants folders/i }));

    await waitFor(() => {
      expect(screen.queryByText('Folder 1')).not.toBeInTheDocument();
    });
  });
});
