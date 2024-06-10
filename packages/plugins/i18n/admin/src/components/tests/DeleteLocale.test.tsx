import { errors } from '@strapi/utils';
import { render, screen, server } from '@tests/utils';
import { rest } from 'msw';

import { DeleteLocale } from '../DeleteLocale';

import type { Locale } from '../../../../shared/contracts/locales';

const LOCALE: Locale = {
  id: 1,
  code: 'en',
  isDefault: false,
  name: 'English',
  createdAt: '',
  updatedAt: '',
};

describe('DeleteLocale', () => {
  it('should render an icon button by default', () => {
    render(<DeleteLocale {...LOCALE} />);

    expect(screen.getByRole('button', { name: 'Delete English locale' })).toBeInTheDocument();
  });

  it('should render a confirmation alertdialog when the icon button is clicked', async () => {
    const { user } = render(<DeleteLocale {...LOCALE} />);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete English locale' }));

    expect(screen.getByRole('alertdialog', { name: 'Confirmation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('should allow you to delete a locale', async () => {
    const { user } = render(<DeleteLocale {...LOCALE} />);

    await user.click(screen.getByRole('button', { name: 'Delete English locale' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await screen.findByText('Deleted locale');
  });

  it('show an error if the deletion failed', async () => {
    server.use(
      rest.delete('/i18n/locales/:id', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            error: new errors.ApplicationError('Could not delete locale'),
          })
        );
      })
    );

    const { user } = render(<DeleteLocale {...LOCALE} />);

    await user.click(screen.getByRole('button', { name: 'Delete English locale' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Could not delete locale')).toBeInTheDocument();
  });
});
