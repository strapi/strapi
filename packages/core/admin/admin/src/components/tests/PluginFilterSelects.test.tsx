import * as React from 'react';

import { act, render, screen, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { PluginFilterSelects } from '../PluginFilterSelects';

import type { SettingsListSelectFilter } from '../../hooks/useSettingsListExtensions';

let loadSpaces: (spaces: Array<{ value: string; label: string }>) => void = () => {};

/** Like a plugin hook that fetches its spaces: empty at first, filled once they arrive */
const useSpaceOptions = () => {
  const [spaces, setSpaces] = React.useState<Array<{ value: string; label: string }>>([]);

  loadSpaces = setSpaces;

  return spaces;
};

const SPACE: SettingsListSelectFilter = {
  pluginId: 'spaces',
  name: 'space',
  label: 'Space',
  placeholder: 'All spaces',
  useOptions: useSpaceOptions,
};

const TEAM: SettingsListSelectFilter = {
  pluginId: 'teams',
  name: 'team',
  label: 'Team',
  placeholder: 'All teams',
  useOptions: () => [{ value: 'blue', label: 'Blue' }],
};

const LocationDisplay = () => <span data-testid="location">{useLocation().search}</span>;

describe('PluginFilterSelects', () => {
  it('shows the value of the URL while the options load, then their label', async () => {
    render(<PluginFilterSelects selects={[SPACE]} />, {
      initialEntries: ['/?plugins[spaces][space]=france'],
    });

    expect(screen.getByRole('combobox', { name: 'Space' })).toHaveTextContent('france');

    act(() => loadSpaces([{ value: 'france', label: 'France' }]));

    expect(screen.getByRole('combobox', { name: 'Space' })).toHaveTextContent('France');
  });

  it('lists the options that arrive after the first render', async () => {
    const { user } = render(<PluginFilterSelects selects={[SPACE]} />);

    act(() => loadSpaces([{ value: 'spain', label: 'Spain' }]));

    await user.click(screen.getByRole('combobox', { name: 'Space' }));

    expect(await screen.findByRole('option', { name: 'Spain' })).toBeInTheDocument();
  });

  it("keeps the other plugins' values when one dropdown changes", async () => {
    const { user } = render(
      <>
        <PluginFilterSelects selects={[SPACE, TEAM]} />
        <LocationDisplay />
      </>,
      { initialEntries: ['/?plugins[spaces][space]=france'] }
    );

    await user.click(screen.getByRole('combobox', { name: 'Team' }));
    await user.click(await screen.findByRole('option', { name: 'Blue' }));

    await waitFor(() => {
      expect(decodeURIComponent(screen.getByTestId('location').textContent ?? '')).toBe(
        '?plugins[spaces][space]=france&plugins[teams][team]=blue'
      );
    });
  });
});
