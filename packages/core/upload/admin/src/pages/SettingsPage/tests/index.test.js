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

    expect(getByRole('checkbox', { name: 'responsiveDimensions' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'sizeOptimization' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'autoOrientation' })).toBeInTheDocument();
  });

  it('should display the form correctly with the initial values', async () => {
    const { getByRole, queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByRole('button', { name: 'Save' })).toBeDisabled();

    expect(getByRole('checkbox', { name: 'responsiveDimensions' })).toBeChecked();
    expect(getByRole('checkbox', { name: 'sizeOptimization' })).toBeChecked();
    expect(getByRole('checkbox', { name: 'autoOrientation' })).toBeChecked();
  });
});
