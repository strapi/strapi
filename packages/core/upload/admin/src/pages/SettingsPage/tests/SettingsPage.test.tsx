// TODO: find a better naming convention for the file that was an index file before
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';
import { render, waitFor } from '@tests/utils';

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
  useAIAvailability: jest.fn(),
}));

import { SettingsPage } from '../SettingsPage';

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

  it('shows AI metadata section when AI is available', async () => {
    (useAIAvailability as jest.Mock).mockReturnValue(true);

    const { getByRole, queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(
      getByRole('heading', {
        name: 'Generate AI captions and alt texts automatically on upload!',
      })
    ).toBeInTheDocument();
  });

  it('hides AI metadata section when AI is not available', async () => {
    (useAIAvailability as jest.Mock).mockReturnValue(false);

    const { queryByRole, queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(
      queryByRole('heading', {
        name: 'Generate AI captions and alt texts automatically on upload!',
      })
    ).not.toBeInTheDocument();
  });
});
