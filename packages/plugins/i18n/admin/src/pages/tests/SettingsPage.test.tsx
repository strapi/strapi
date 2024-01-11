import { within } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { rest } from 'msw';

import { SettingsPage } from '../SettingsPage';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useFocusWhenNavigate: jest.fn(),
}));

describe('Settings Page', () => {
  it('renders correctly with default data', async () => {
    render(<SettingsPage />);

    expect(screen.getByText('Loading content.')).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: 'Internationalization' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add new locale' })).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();

    const HEADER_CELLS = ['ID', 'Display name', 'Default locale', 'Actions'];
    const EN_ROW_CELLS = ['1', 'English', 'Default', 'Edit'];
    const FR_ROW_CELLS = ['2', 'Français', 'Edit Delete'];

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

  it('renders the create modal successfully', async () => {
    const { user } = render(<SettingsPage />);

    expect(
      await screen.findByRole('heading', { name: 'Internationalization' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add new locale' }));

    const dialog = screen.getByRole('dialog', { name: 'Add new locale' });

    expect(dialog).toBeInTheDocument();

    expect(within(dialog).getByRole('heading', { name: 'Add new locale' })).toBeInTheDocument();
  });

  it('renders the edit modal successfully', async () => {
    const { user } = render(<SettingsPage />);

    expect(
      await screen.findByRole('heading', { name: 'Internationalization' })
    ).toBeInTheDocument();

    /**
     * click the first edit button which will be the EN locale
     */
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    const dialog = screen.getByRole('dialog', { name: 'Edit a locale' });

    expect(dialog).toBeInTheDocument();

    expect(within(dialog).getByRole('heading', { name: 'Edit a locale' })).toBeInTheDocument();
  });

  it('renders the delete modal successfully', async () => {
    const { user } = render(<SettingsPage />);

    expect(
      await screen.findByRole('heading', { name: 'Internationalization' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog', { name: 'Confirmation' });

    expect(dialog).toBeInTheDocument();

    expect(within(dialog).getByRole('heading', { name: 'Confirmation' })).toBeInTheDocument();
  });
});
