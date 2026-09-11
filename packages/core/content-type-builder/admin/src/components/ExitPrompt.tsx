import { useEffect } from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Dialog } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useBlocker } from 'react-router-dom';

import { useDataManager } from '../components/DataManager/useDataManager';
import { getTrad } from '../utils/getTrad';

const BUILDER_ROOT = '/plugins/content-type-builder';

/**
 * The builder's index lives at the plugin root, with no trailing slash — so a
 * rule written as `startsWith('<root>/')` counted a trip back to the list of
 * schemas as leaving the builder, and warned you were about to lose work you
 * were not going anywhere near.
 */
const isInBuilder = (pathname: string) =>
  pathname === BUILDER_ROOT || pathname.startsWith(`${BUILDER_ROOT}/`);

export const ExitPrompt = () => {
  const { formatMessage } = useIntl();
  const { isModified, isSaving } = useDataManager();

  const confirmationMessage = formatMessage({
    id: getTrad('prompt.unsaved'),
    defaultMessage: 'Are you sure you want to leave? All your modifications will be lost.',
  });

  const blocker = useBlocker((ctx) => {
    return (
      isInBuilder(ctx.currentLocation.pathname) &&
      !isInBuilder(ctx.nextLocation.pathname) &&
      isModified
    );
  });

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isModified && !isSaving) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [confirmationMessage, isModified, isSaving]);

  if (blocker.state === 'blocked') {
    return (
      <Dialog.Root open onOpenChange={() => blocker.reset()}>
        <ConfirmDialog onConfirm={() => blocker.proceed()}>{confirmationMessage}</ConfirmDialog>
      </Dialog.Root>
    );
  }

  return null;
};
