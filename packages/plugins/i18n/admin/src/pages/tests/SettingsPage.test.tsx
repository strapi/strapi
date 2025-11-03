import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';
import { render, screen, server } from '@tests/utils';
import { rest } from 'msw';

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
  useAIAvailability: jest.fn(),
}));

import { SettingsPage } from '../SettingsPage';

describe('Settings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default data', async () => {
    render(<SettingsPage />);

    expect(screen.getByText('Loading content.')).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: 'Internationalization' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add new locale' })).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();

    const HEADER_CELLS = ['ID', 'Display name', 'Default locale', 'Actions'];
    const EN_ROW_CELLS = ['1', 'English', 'Default', 'Edit English locale'];
    const FR_ROW_CELLS = ['2', 'Français', 'Edit Français locale Delete Français locale'];

    expect(screen.getByRole('row', { name: HEADER_CELLS.join(' ') })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: EN_ROW_CELLS.join(' ') })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: FR_ROW_CELLS.join(' ') })).toBeInTheDocument();

    HEADER_CELLS.forEach((cell) =>
      expect(screen.getByRole('gridcell', { name: cell })).toBeInTheDocument()
    );
    EN_ROW_CELLS.forEach((cell) =>
      expect(screen.getByRole('gridcell', { name: cell })).toBeInTheDocument()
    );
    FR_ROW_CELLS.forEach((cell) =>
      expect(screen.getByRole('gridcell', { name: cell })).toBeInTheDocument()
    );
  });

  it('renders the no locales layout correctly', async () => {
    server.use(rest.get('/i18n/locales', (_, res, ctx) => res(ctx.json([]))));

    render(<SettingsPage />);

    expect(
      await screen.findByRole('heading', { name: 'Internationalization' })
    ).toBeInTheDocument();

    expect(screen.getByText('There are no locales')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add new locale' })).toHaveLength(2);
  });

  it('should display AI translations section when AI is available', async () => {
    (useAIAvailability as jest.Mock).mockReturnValue(true);

    render(<SettingsPage />);

    // Wait for the page to load completely
    await screen.findByRole('heading', { name: 'Internationalization' });

    // Check that AI Translations section is visible
    expect(await screen.findByRole('heading', { name: 'AI Translations' })).toBeInTheDocument();
    expect(
      await screen.findByText(
        /Everytime you save in the Content Manager, our AI will use your default locale to translate all other locales automatically/i
      )
    ).toBeInTheDocument();
  });

  it('should not display AI translations section when AI is not available', async () => {
    (useAIAvailability as jest.Mock).mockReturnValue(false);

    render(<SettingsPage />);

    // Wait for the page to load
    await screen.findByRole('heading', { name: 'Internationalization' });

    // Check that AI Translations section is NOT visible
    expect(screen.queryByRole('heading', { name: 'AI Translations' })).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /Everytime you save in the Content Manager, our AI will use your default locale to translate all other locales automatically/i
      )
    ).not.toBeInTheDocument();
  });
});
