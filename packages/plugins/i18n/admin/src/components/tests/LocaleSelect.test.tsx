import { render, waitFor, screen } from '@tests/utils';

import { LocaleSelect } from '../LocaleSelect';

jest.mock('../../hooks/useLocales');
jest.mock('../../hooks/useDefaultLocales');

describe('LocaleSelect', () => {
  it('only shows the locales that have not already been used', async () => {
    const { user } = render(<LocaleSelect onLocaleChange={jest.fn()} />);

    await waitFor(() =>
      expect(screen.queryByText('Loading the available locales...')).not.toBeInTheDocument()
    );

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByRole('option', { name: 'Afrikaans (af)' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'French (fr)' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'English (en)' })).not.toBeInTheDocument();
  });

  it('brings back an object of code and displayName keys when changing', async () => {
    const onLocaleChangeSpy = jest.fn();
    const { user } = render(<LocaleSelect onLocaleChange={onLocaleChangeSpy} />);

    await waitFor(() =>
      expect(screen.queryByText('Loading the available locales...')).not.toBeInTheDocument()
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'French (fr)' }));

    expect(onLocaleChangeSpy.mock.calls[0]).toMatchInlineSnapshot(`
      [
        {
          "code": "fr",
          "name": "French (fr)",
        },
      ]
    `);
  });
});
