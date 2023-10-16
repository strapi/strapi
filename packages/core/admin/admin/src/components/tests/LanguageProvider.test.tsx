import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useIntl } from 'react-intl';

import en from '../../translations/en.json';
import fr from '../../translations/fr.json';
import { LanguageProvider, useLocales } from '../LanguageProvider';

const messages = { en, fr };
const localeNames = { en: 'English', fr: 'Français' };

const user = userEvent.setup();

describe('LanguageProvider', () => {
  afterEach(() => {
    localStorage.removeItem('strapi-admin-language');
  });

  it('should not crash', () => {
    const { getByText } = render(
      <LanguageProvider messages={messages} localeNames={localeNames}>
        <div>Test</div>
      </LanguageProvider>
    );

    expect(getByText('Test')).toBeInTheDocument();
  });

  it('should change the locale and set the strapi-admin-language item in the localStorage', async () => {
    const Test = () => {
      const { locale } = useIntl();
      const { changeLocale } = useLocales();

      return (
        <div>
          <h1>{localeNames[locale as keyof typeof messages]}</h1>
          <button type="button" onClick={() => changeLocale('fr')}>
            CHANGE
          </button>
        </div>
      );
    };

    const { getByText, getByRole } = render(
      <LanguageProvider messages={messages} localeNames={localeNames}>
        <Test />
      </LanguageProvider>
    );

    expect(localStorage.getItem('strapi-admin-language')).toEqual('en');

    expect(getByText('English')).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'CHANGE' }));

    expect(getByText('Français')).toBeInTheDocument();
    expect(localStorage.getItem('strapi-admin-language')).toEqual('fr');
  });
});
