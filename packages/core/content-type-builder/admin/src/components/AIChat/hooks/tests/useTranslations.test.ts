import { createElement } from 'react';

import { renderHook } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { pluginId } from '../../../../pluginId';
import fr from '../../../../translations/fr.json';
import { prefixPluginTranslations } from '../../../../utils/prefixPluginTranslations';
import { useTranslations } from '../useTranslations';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(
    IntlProvider,
    { locale: 'fr', messages: prefixPluginTranslations(fr, pluginId), onError: () => {} },
    children
  );

describe('CTB | AIChat | useTranslations', () => {
  it('resolves an id from the plugin catalog, which is registered with the plugin prefix', () => {
    const { result } = renderHook(() => useTranslations(), { wrapper });

    expect(result.current.t('chat.header.default-title', 'New conversation')).toBe(
      fr['chat.header.default-title']
    );
  });

  it('falls back to the default message when the id is not in the catalog', () => {
    const { result } = renderHook(() => useTranslations(), { wrapper });

    expect(result.current.t('chat.unknown-id', 'Fallback')).toBe('Fallback');
  });
});
