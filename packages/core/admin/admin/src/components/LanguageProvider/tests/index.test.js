import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useIntl } from 'react-intl';
import useLocalesProvider from '../../LocalesProvider/useLocalesProvider';
import LanguageProvider from '../index';
import en from '../../../translations/en.json';
import fr from '../../../translations/fr.json';

const messages = { en, fr };
const localeNames = { en: 'English', fr: 'Français' };

describe('LanguageProvider', () => {
  afterEach(() => {
    localStorage.removeItem('strapi-admin-language');
  });

  it('should not crash', () => {
    const { container } = render(
      <LanguageProvider messages={messages} localeNames={localeNames}>
        <div>Test</div>
      </LanguageProvider>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        Test
      </div>
    `);
  });

  it('should change the locale and set the strapi-admin-language item in the localStorage', async () => {
    const Test = () => {
      const { locale } = useIntl();
      const { changeLocale } = useLocalesProvider();

      return (
        <div>
          <h1>{localeNames[locale]}</h1>
          <button type="button" onClick={() => changeLocale('fr')}>
            CHANGE
          </button>
        </div>
      );
    };

    render(
      <LanguageProvider messages={messages} localeNames={localeNames}>
        <Test />
      </LanguageProvider>
    );

    expect(localStorage.getItem('strapi-admin-language')).toEqual('en');

    expect(screen.getByText('English')).toBeInTheDocument();

    userEvent.click(screen.getByText('CHANGE'));

    await waitFor(() => expect(screen.getByText('Français')).toBeInTheDocument());
    expect(localStorage.getItem('strapi-admin-language')).toEqual('fr');
  });
});
