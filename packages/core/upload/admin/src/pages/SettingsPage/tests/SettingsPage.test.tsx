// TODO: find a better naming convention for the file that was an index file before
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';
import { render, waitFor, screen } from '@tests/utils';

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
  useAIAvailability: jest.fn(),
}));

import { SettingsPage } from '../SettingsPage';

describe('SettingsPage', () => {
  beforeEach(() => {
    (useAIAvailability as jest.Mock).mockReturnValue(false);
    jest.clearAllMocks();
  });

  it('renders', async () => {
    render(<SettingsPage />);

    expect(await screen.findByRole('heading', { name: 'Media Library' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Asset management' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(
      screen.getByRole('checkbox', { name: 'Responsive friendly upload' })
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Size optimization' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Auto orientation' })).toBeInTheDocument();
  });

  it('should display the form correctly with the initial values', async () => {
    render(<SettingsPage />);

    await screen.findByRole('heading', { name: 'Media Library' });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    expect(screen.getByRole('checkbox', { name: 'Responsive friendly upload' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Size optimization' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Auto orientation' })).toBeChecked();
  });

  it('shows AI metadata section when AI is available', async () => {
    (useAIAvailability as jest.Mock).mockReturnValue(true);

    render(<SettingsPage />);

    // Wait for the page to load completely
    await screen.findByRole('heading', { name: 'Media Library' });

    // Check that AI metadata section is visible
    expect(
      await screen.findByRole('heading', {
        name: 'Generate AI captions and alt texts automatically on upload!',
      })
    ).toBeInTheDocument();
  });

  it('hides AI metadata section when AI is not available', async () => {
    (useAIAvailability as jest.Mock).mockReturnValue(false);

    render(<SettingsPage />);

    // Wait for the page to load
    await screen.findByRole('heading', { name: 'Media Library' });

    // Check that AI metadata section is NOT visible
    expect(
      screen.queryByRole('heading', {
        name: 'Generate AI captions and alt texts automatically on upload!',
      })
    ).not.toBeInTheDocument();
  });
});
