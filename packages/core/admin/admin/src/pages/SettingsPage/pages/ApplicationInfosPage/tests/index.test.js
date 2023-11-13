import React from 'react';

import { useAppInfo, useRBAC } from '@strapi/helper-plugin';
import { fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import { render, waitFor } from '@tests/utils';

import ApplicationInfosPage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }) => <div>{children}</div>,
  useAppInfo: jest.fn(() => ({ shouldUpdateStrapi: false, latestStrapiReleaseTag: 'v3.6.8' })),
  useRBAC: jest.fn(() => ({ allowedActions: { canRead: true, canUpdate: true } })),
}));

describe('Application page', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not display link upgrade version if not necessary', async () => {
    const { queryByText } = render(<ApplicationInfosPage />);

    await waitForElementToBeRemoved(() => queryByText('Loading'));

    expect(queryByText('Upgrade your admin panel')).not.toBeInTheDocument();
  });

  it('should display upgrade version warning if the version is behind the latest one', async () => {
    useAppInfo.mockReturnValue({
      shouldUpdateStrapi: true,
      latestStrapiReleaseTag: 'v3.6.8',
      strapiVersion: '4.0.0',
    });

    const { getByText, queryByText } = render(<ApplicationInfosPage />);

    await waitForElementToBeRemoved(() => queryByText('Loading'));

    expect(getByText('v4.0.0')).toBeInTheDocument();
    expect(getByText('Upgrade your admin panel')).toBeInTheDocument();
  });

  it('should render logo input if read permissions', async () => {
    const { queryByText } = render(<ApplicationInfosPage />);

    await waitForElementToBeRemoved(() => queryByText('Loading'));

    expect(queryByText('Menu logo')).toBeInTheDocument();
  });

  it('should not render logo input if no read permissions', async () => {
    useRBAC.mockImplementationOnce(() => ({
      allowedActions: { canRead: false, canUpdate: false },
    }));
    const { queryByText } = render(<ApplicationInfosPage />);

    expect(queryByText('Menu logo')).not.toBeInTheDocument();
  });

  it('should render save button if update permissions', async () => {
    const { queryByText } = render(<ApplicationInfosPage />);

    await waitForElementToBeRemoved(() => queryByText('Loading'));

    expect(queryByText('Save')).toBeInTheDocument();
  });

  it('should not render save button if no update permissions', async () => {
    useRBAC.mockReturnValue({ allowedActions: { canRead: true, canUpdate: false } });

    const { queryByText } = render(<ApplicationInfosPage />);

    await waitForElementToBeRemoved(() => queryByText('Loading'));

    expect(queryByText('Save')).not.toBeInTheDocument();
  });

  it('should update project settings on save', async () => {
    useRBAC.mockReturnValue({ allowedActions: { canRead: true, canUpdate: true } });

    const { getByRole, queryByText, getByText } = render(<ApplicationInfosPage />);

    await waitForElementToBeRemoved(() => queryByText('Loading'));

    fireEvent.click(getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(getByText('Saved')).toBeInTheDocument());
  });
});
