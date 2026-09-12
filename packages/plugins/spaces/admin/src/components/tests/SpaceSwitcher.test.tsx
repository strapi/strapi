import { FRANCE, setMine } from '@tests/server';
import { render, screen, waitFor } from '@tests/utils';

import { STORAGE_KEY } from '../../constants';
import { setSelectedSpace } from '../../selectedSpace';
import { SpaceSwitcher } from '../SpaceSwitcher';

describe('SpaceSwitcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setSelectedSpace(null);
  });

  it('offers the spaces the caller can work in', async () => {
    render(<SpaceSwitcher />);

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Space' })).toBeVisible());

    expect(screen.getByRole('combobox', { name: 'Space' })).toHaveTextContent('France');
  });

  it('offers the all-spaces view to someone who may use it', async () => {
    const { user } = render(<SpaceSwitcher />);

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Space' })).toBeVisible());
    await user.click(screen.getByRole('combobox', { name: 'Space' }));

    expect(await screen.findByRole('option', { name: 'All spaces' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'Germany' })).toBeVisible();
  });

  it('does not offer it to someone who may not', async () => {
    setMine({ canAccessAll: false });

    const { user } = render(<SpaceSwitcher />);

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Space' })).toBeVisible());
    await user.click(screen.getByRole('combobox', { name: 'Space' }));

    expect(await screen.findByRole('option', { name: 'Germany' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'All spaces' })).not.toBeInTheDocument();
  });

  it('stays out of the way when there is nothing to switch between', async () => {
    // One space and no cross-space view: the switcher would only be noise.
    setMine({ canAccessAll: false, data: [FRANCE] });

    render(<SpaceSwitcher />);

    // The message shown when there is nowhere to work would appear here if the
    // component confused "one space" with "no spaces".
    await waitFor(() =>
      expect(screen.queryByText(/do not belong to any space/i)).not.toBeInTheDocument()
    );
    expect(screen.queryByRole('combobox', { name: 'Space' })).not.toBeInTheDocument();
  });

  it('says so when the caller belongs to nowhere', async () => {
    setMine({
      canAccessAll: false,
      data: [],
      current: null,
      unavailableReason: 'You do not belong to any space.',
    });

    render(<SpaceSwitcher />);

    expect(await screen.findByText('You do not belong to any space.')).toBeVisible();
  });

  it('remembers the chosen space and reloads', async () => {
    // Almost every screen caches content belonging to the space that was in
    // force when it was fetched, so a switch reloads rather than updating the
    // page in pieces.
    const reload = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    const { user } = render(<SpaceSwitcher />);

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Space' })).toBeVisible());
    await user.click(screen.getByRole('combobox', { name: 'Space' }));
    await user.click(await screen.findByRole('option', { name: 'Germany' }));

    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('germany');
  });
});
