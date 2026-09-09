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

interface I18nSharedFieldsLockProps {
  children: React.ReactNode;
  /**
   * Changing this key (document id + locale) clears an accepted unlock so a
   * locale switch or a different entry starts locked again.
   */
  resetKey: string;
}

/**
 * Holds whether the editor accepted the warning to edit non-localized fields
 * on a secondary locale. Reset when the document or locale changes.
 */
const I18nSharedFieldsLock = ({ children, resetKey }: I18nSharedFieldsLockProps) => {
  const [isUnlocked, setIsUnlocked] = React.useState(false);

  React.useEffect(() => {
    setIsUnlocked(false);
  }, [resetKey]);

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
