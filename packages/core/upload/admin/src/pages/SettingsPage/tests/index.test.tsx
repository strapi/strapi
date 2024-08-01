import React from 'react';

import { render, waitFor } from '@tests/utils';

import { SettingsPage } from '../index';

describe('SettingsPage', () => {
  it('renders', async () => {
    const { getByRole, queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByRole('heading', { name: 'Media Library' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Asset management' })).toBeInTheDocument();

    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(getByRole('checkbox', { name: 'Responsive friendly upload' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Size optimization' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Auto orientation' })).toBeInTheDocument();
  });

  it('should display the form correctly with the initial values', async () => {
    const { getByRole, queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByRole('button', { name: 'Save' })).toBeDisabled();

    expect(getByRole('checkbox', { name: 'Responsive friendly upload' })).toBeChecked();
    expect(getByRole('checkbox', { name: 'Size optimization' })).toBeChecked();
    expect(getByRole('checkbox', { name: 'Auto orientation' })).toBeChecked();
  });
});
