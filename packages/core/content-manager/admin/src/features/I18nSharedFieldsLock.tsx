import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';

interface I18nSharedFieldsLockContextValue {
  isUnlocked: boolean;
  unlock: () => void;
  relock: () => void;
}

const [I18nSharedFieldsLockProvider, useI18nSharedFieldsLock] =
  createContext<I18nSharedFieldsLockContextValue>('I18nSharedFieldsLock', {
    isUnlocked: false,
    unlock: () => undefined,
    relock: () => undefined,
  });

/**
 * Holds whether the editor accepted the warning to edit non-localized fields
 * on a secondary locale. Always starts locked: key the provider by document
 * and locale so a locale switch or a different entry relocks.
 */
const I18nSharedFieldsLock = ({ children }: { children: React.ReactNode }) => {
  const [isUnlocked, setIsUnlocked] = React.useState(false);

  const unlock = React.useCallback(() => setIsUnlocked(true), []);
  const relock = React.useCallback(() => setIsUnlocked(false), []);

  return (
    <I18nSharedFieldsLockProvider isUnlocked={isUnlocked} unlock={unlock} relock={relock}>
      {children}
    </I18nSharedFieldsLockProvider>
  );
};

export { I18nSharedFieldsLock, useI18nSharedFieldsLock };
export type { I18nSharedFieldsLockContextValue };
