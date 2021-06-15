import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useIntl } from 'react-intl';
import useLocalesProvider from '../../LocalesProvider/useLocalesProvider';
import LanguageProvider from '../index';
import en from '../../../translations/en.json';
import fr from '../../../translations/fr.json';

const messages = { en, fr };
const localesNativeNames = { en: 'English', fr: 'Français' };

describe('LanguageProvider', () => {
  it('should not crash', () => {
    const { container } = render(
      <LanguageProvider messages={messages} localesNativeNames={localesNativeNames}>
        <div>Test</div>
      </LanguageProvider>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        Test
      </div>
    `);
  });

  it('should change the locale', () => {
    const Test = () => {
      const { locale } = useIntl();
      const { changeLocale } = useLocalesProvider();

      return (
        <div>
          <h1>{localesNativeNames[locale]}</h1>
          <button type="button" onClick={() => changeLocale('fr')}>
            CHANGE
          </button>
        </div>
      );
    };

    render(
      <LanguageProvider messages={messages} localesNativeNames={localesNativeNames}>
        <Test />
      </LanguageProvider>
    );

    expect(screen.getByText('English')).toBeInTheDocument();

    userEvent.click(screen.getByText('CHANGE'));

    expect(screen.getByText('Français')).toBeInTheDocument();
  });
});
