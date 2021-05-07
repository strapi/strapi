import React from 'react';
import { render, screen } from '@testing-library/react';
import LocaleListCell from '../LocaleListCell';

jest.mock('@buffetjs/styles', () => ({
  Tooltip: () => null,
}));

jest.mock('@buffetjs/core', () => ({
  Padded: props => <div {...props} />,
  Text: props => <p {...props} />,
}));

describe('LocaleListCell', () => {
  it('returns the default locale first, then the others sorted alphabetically', () => {
    const locales = [
      {
        id: 1,
        name: 'English',
        code: 'en',
        created_at: '2021-03-09T14:57:03.016Z',
        updated_at: '2021-03-09T14:57:03.016Z',
        isDefault: false,
      },
      {
        id: 2,
        name: 'French',
        code: 'fr-FR',
        created_at: '2021-03-09T15:03:06.992Z',
        updated_at: '2021-03-17T13:01:03.569Z',
        isDefault: true,
      },
      {
        id: 3,
        name: 'Arabic',
        code: 'ar',
        created_at: '2021-03-09T15:03:06.992Z',
        updated_at: '2021-03-17T13:01:03.569Z',
        isDefault: false,
      },
    ];

    const locale = 'en';
    const localizations = [{ locale: 'fr-FR' }, { locale: 'ar' }];

    render(
      <LocaleListCell id={12} locales={locales} locale={locale} localizations={localizations} />
    );

    expect(screen.getByText('French (default), Arabic, English')).toBeVisible();
  });

  it('returns the "ar" when there s 2 locales available', () => {
    const locales = [
      {
        id: 1,
        name: 'English',
        code: 'en',
        created_at: '2021-03-09T14:57:03.016Z',
        updated_at: '2021-03-09T14:57:03.016Z',
        isDefault: false,
      },
      {
        id: 2,
        name: 'French',
        code: 'fr-FR',
        created_at: '2021-03-09T15:03:06.992Z',
        updated_at: '2021-03-17T13:01:03.569Z',
        isDefault: true,
      },
      {
        id: 3,
        name: 'Arabic',
        code: 'ar',
        created_at: '2021-03-09T15:03:06.992Z',
        updated_at: '2021-03-17T13:01:03.569Z',
        isDefault: false,
      },
    ];

    const locale = 'en';
    const localizations = [{ locale: 'ar' }];

    render(
      <LocaleListCell id={12} locales={locales} locale={locale} localizations={localizations} />
    );

    expect(screen.getByText('Arabic, English')).toBeVisible();
  });

  it('returns the "ar" and "en" locales  alphabetically sorted', () => {
    const locales = [
      {
        id: 1,
        name: 'English',
        code: 'en',
        created_at: '2021-03-09T14:57:03.016Z',
        updated_at: '2021-03-09T14:57:03.016Z',
        isDefault: false,
      },
      {
        id: 2,
        name: 'French',
        code: 'fr-FR',
        created_at: '2021-03-09T15:03:06.992Z',
        updated_at: '2021-03-17T13:01:03.569Z',
        isDefault: true,
      },
      {
        id: 3,
        name: 'Arabic',
        code: 'ar',
        created_at: '2021-03-09T15:03:06.992Z',
        updated_at: '2021-03-17T13:01:03.569Z',
        isDefault: false,
      },
    ];

    const locale = 'fr-FR';
    const localizations = [{ locale: 'en' }, { locale: 'ar' }];

    render(
      <LocaleListCell id={12} locales={locales} locale={locale} localizations={localizations} />
    );

    expect(screen.getByText('French (default), Arabic, English')).toBeVisible();
  });
});
