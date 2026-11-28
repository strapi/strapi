import { render, screen } from '@testing-library/react';
import { useIntl } from 'react-intl';

import { LanguageProvider } from '../LanguageProvider';

let mockLocale = 'zh';

jest.mock('../../core/store/hooks', () => ({
  useTypedSelector: () => mockLocale,
}));

const messages = {
  en: { greeting: 'Hello' },
  zh: { greeting: '您好' },
};

const LocalizedContent = () => {
  const intl = useIntl();

  return (
    <>
      <p>{intl.formatMessage({ id: 'greeting' })}</p>
      <p>
        {intl.formatDate(new Date('2026-03-01T12:00:00Z'), { weekday: 'short', timeZone: 'UTC' })}
      </p>
      <p>{intl.locale}</p>
    </>
  );
};

it('uses Traditional Chinese formatting and keeps the existing translation catalog', () => {
  const previousLanguage = document.documentElement.lang;

  try {
    const app = (
      <LanguageProvider messages={messages}>
        <LocalizedContent />
      </LanguageProvider>
    );
    const { rerender } = render(app);

    expect(screen.getByText('您好')).toBeInTheDocument();
    expect(screen.getByText('週日')).toBeInTheDocument();
    expect(screen.getByText('zh-Hant')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('zh-Hant');

    mockLocale = 'en';
    rerender(
      <LanguageProvider messages={messages}>
        <LocalizedContent />
      </LanguageProvider>
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  } finally {
    document.documentElement.lang = previousLanguage;
    mockLocale = 'zh';
  }
});
