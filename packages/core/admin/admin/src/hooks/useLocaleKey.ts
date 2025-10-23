import * as React from 'react';

import { HOOKS } from '../constants';
import { useStrapiApp } from '../features/StrapiApp';

/**
 * @public
 * @description Hook that safely gets the current locale key for form inputs.
 * Returns 'default' if i18n plugin is not available or no locale is set.
 * @example
 * ```tsx
 * const Component = () => {
 *   const localeKey = useLocaleKey();
 * };
 * ```
 */
const useLocaleKey = (): string => {
  const runHookSeries = useStrapiApp('useLocaleKey', (state) => state.runHookSeries);

  const localeKey = React.useMemo(() => {
    try {
      // Try to get locale key from i18n plugin if available
      const results = runHookSeries(HOOKS.GET_LOCALE_KEY);
      // If i18n plugin is registered, it will return the locale key
      // If not, the hook won't exist and results will be empty
      return Array.isArray(results) && results.length > 0 ? results[0] : 'default';
    } catch {
      // Fallback if hook doesn't exist or fails
      return 'default';
    }
  }, [runHookSeries]);

  return localeKey;
};

export { useLocaleKey };
