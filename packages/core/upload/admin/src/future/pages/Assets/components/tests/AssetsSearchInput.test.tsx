import { act, render, screen } from '@tests/utils';

import { AssetsSearchInput } from '../AssetsSearchInput';

const mockSetQuery = jest.fn();
const mockUseQueryParams = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: (...args: unknown[]) => mockUseQueryParams(...args),
}));

const DEBOUNCE_MS = 300;

const renderInput = () =>
  render(<AssetsSearchInput />, {
    userEventOptions: { advanceTimers: jest.advanceTimersByTime },
  });

describe('AssetsSearchInput', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseQueryParams.mockReturnValue([{ query: {} }, mockSetQuery]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders an accessible search box', () => {
    renderInput();

    expect(screen.getByRole('searchbox', { name: 'Search for an asset' })).toBeInTheDocument();
  });

  it('offers a clear action once there is something to clear', async () => {
    const { user } = renderInput();

    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'kit');

    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  it('uses a placeholder distinct from the sidebar folder filter', () => {
    renderInput();

    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Search');
  });

  it('does not write the URL before the debounce elapses', async () => {
    const { user } = renderInput();

    await user.type(screen.getByRole('searchbox'), 'kit');

    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('writes the URL exactly once after the debounce settles', async () => {
    const { user } = renderInput();

    await user.type(screen.getByRole('searchbox'), 'kit');

    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(mockSetQuery).toHaveBeenCalledTimes(1);
    expect(mockSetQuery).toHaveBeenCalledWith({ _q: 'kit' }, 'push', true);
  });

  it('encodes the committed value', async () => {
    const { user } = renderInput();

    await user.type(screen.getByRole('searchbox'), 'a&b');

    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(mockSetQuery).toHaveBeenCalledWith({ _q: 'a%26b' }, 'push', true);
  });

  it('removes _q when the input is cleared', async () => {
    mockUseQueryParams.mockReturnValue([{ query: { _q: 'kitten' } }, mockSetQuery]);

    const { user } = renderInput();

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(mockSetQuery).toHaveBeenCalledWith({ _q: '' }, 'remove', true);
  });

  it('shows the value from the URL on mount', () => {
    mockUseQueryParams.mockReturnValue([{ query: { _q: 'kitten' } }, mockSetQuery]);

    renderInput();

    expect(screen.getByRole('searchbox')).toHaveValue('kitten');
    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('updates the displayed value when _q changes externally', () => {
    const { rerender } = renderInput();

    expect(screen.getByRole('searchbox')).toHaveValue('');

    mockUseQueryParams.mockReturnValue([{ query: { _q: 'puppy' } }, mockSetQuery]);
    rerender(<AssetsSearchInput />);

    expect(screen.getByRole('searchbox')).toHaveValue('puppy');
  });

  it('does not write back to the URL after an external change', () => {
    const { rerender } = renderInput();

    mockUseQueryParams.mockReturnValue([{ query: { _q: 'puppy' } }, mockSetQuery]);
    rerender(<AssetsSearchInput />);

    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });

    // The guard must stop the two sync effects ping-ponging.
    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('drops an uncommitted term when a folder navigation clears the search', async () => {
    const { user, rerender } = renderInput();

    await user.type(screen.getByRole('searchbox'), 'kit');

    mockUseQueryParams.mockReturnValue([{ query: { folder: '3' } }, mockSetQuery]);
    rerender(<AssetsSearchInput />);

    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(mockSetQuery).not.toHaveBeenCalled();
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('still commits typing while a folder is open', async () => {
    mockUseQueryParams.mockReturnValue([{ query: { folder: '3' } }, mockSetQuery]);

    const { user } = renderInput();

    await user.type(screen.getByRole('searchbox'), 'kit');

    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(mockSetQuery).toHaveBeenCalledWith({ _q: 'kit' }, 'push', true);
  });

  it('does not submit the form when Enter is pressed', async () => {
    const { user } = renderInput();

    const searchbox = screen.getByRole('searchbox');
    const onSubmit = jest.fn();
    searchbox.closest('form')!.addEventListener('submit', onSubmit);

    await user.type(searchbox, 'kit{Enter}');

    expect(onSubmit.mock.calls.every(([event]) => event.defaultPrevented)).toBe(true);
  });
});
