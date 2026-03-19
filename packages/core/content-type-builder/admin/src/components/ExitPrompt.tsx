import { useEffect } from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Dialog } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useBlocker } from 'react-router-dom';

import { useDataManager } from '../components/DataManager/useDataManager';
import { getTrad } from '../utils/getTrad';

export const ExitPrompt = () => {
  const { formatMessage } = useIntl();
  const { isModified, isSaving } = useDataManager();

  const confirmationMessage = formatMessage({
    id: getTrad('prompt.unsaved'),
    defaultMessage: 'Are you sure you want to leave? All your modifications will be lost.',
  });

  const blocker = useBlocker((ctx) => {
    return (
      ctx.currentLocation.pathname.startsWith('/plugins/content-type-builder/') &&
      !ctx.nextLocation.pathname.startsWith('/plugins/content-type-builder/') &&
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
