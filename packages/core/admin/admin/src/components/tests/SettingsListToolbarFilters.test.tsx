import * as React from 'react';

import { act, render, screen, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import {
  SettingsListToolbarFilters,
  SettingsListToolbarSelect,
} from '../SettingsListToolbarFilters';

import type {
  SettingsListToolbarFilter,
  SettingsListToolbarFilterProps,
} from '../../hooks/useSettingsListExtensions';

type Options = Array<{ value: string; label: string }>;

let loadSpaces: (spaces: Options) => void = () => {};

/** Like a plugin filter that fetches its spaces: loading at first, filled once they arrive */
const SpaceFilter = (props: SettingsListToolbarFilterProps) => {
  const [spaces, setSpaces] = React.useState<Options | undefined>();

  loadSpaces = setSpaces;

  return (
    <SettingsListToolbarSelect
      {...props}
      label="Space"
      placeholder="All spaces"
      options={spaces ?? []}
      isLoading={spaces === undefined}
    />
  );
};

const TeamFilter = (props: SettingsListToolbarFilterProps) => (
  <SettingsListToolbarSelect
    {...props}
    label="Team"
    placeholder="All teams"
    options={[{ value: 'blue', label: 'Blue' }]}
  />
);

const SPACE: SettingsListToolbarFilter = {
  pluginId: 'spaces',
  name: 'space',
  Component: SpaceFilter,
};
const TEAM: SettingsListToolbarFilter = { pluginId: 'teams', name: 'team', Component: TeamFilter };

const LocationDisplay = () => <span data-testid="location">{useLocation().search}</span>;

const search = () => decodeURIComponent(screen.getByTestId('location').textContent ?? '');

describe('SettingsListToolbarFilters', () => {
  it('keeps the value of the URL while the options load, then shows its label', async () => {
    render(
      <>
        <SettingsListToolbarFilters filters={[SPACE]} />
        <LocationDisplay />
      </>,
      { initialEntries: ['/?plugins[spaces][space]=france'] }
    );

    expect(screen.getByRole('combobox', { name: 'Space' })).not.toHaveTextContent('france');
    expect(search()).toBe('?plugins[spaces][space]=france');

    act(() => loadSpaces([{ value: 'france', label: 'France' }]));

    expect(screen.getByRole('combobox', { name: 'Space' })).toHaveTextContent('France');
    expect(search()).toBe('?plugins[spaces][space]=france');
  });

  it('lists the options that arrive after the first render', async () => {
    const { user } = render(<SettingsListToolbarFilters filters={[SPACE]} />);

    act(() => loadSpaces([{ value: 'spain', label: 'Spain' }]));

    await user.click(screen.getByRole('combobox', { name: 'Space' }));

    expect(await screen.findByRole('option', { name: 'Spain' })).toBeInTheDocument();
  });

  it('clears a value no option has once the options are loaded', async () => {
    render(
      <>
        <SettingsListToolbarFilters filters={[TEAM]} />
        <LocationDisplay />
      </>,
      { initialEntries: ['/?plugins[teams][team]=ghost'] }
    );

    await waitFor(() => expect(search()).toBe(''));
    expect(screen.getByRole('combobox', { name: 'Team' })).toHaveTextContent('All teams');
  });

  it("keeps the other plugins' values when one filter changes", async () => {
    const { user } = render(
      <>
        <SettingsListToolbarFilters filters={[SPACE, TEAM]} />
        <LocationDisplay />
      </>,
      { initialEntries: ['/?plugins[spaces][space]=france'] }
    );

    act(() => loadSpaces([{ value: 'france', label: 'France' }]));

    await user.click(screen.getByRole('combobox', { name: 'Team' }));
    await user.click(await screen.findByRole('option', { name: 'Blue' }));

    await waitFor(() =>
      expect(search()).toBe('?plugins[spaces][space]=france&plugins[teams][team]=blue')
    );
  });
});
