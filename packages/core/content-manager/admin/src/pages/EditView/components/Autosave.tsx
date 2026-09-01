import * as React from 'react';

import { useForm } from '@strapi/admin/strapi-admin';
import { Box, Button, Dialog, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import {
  createAutosaveKey,
  deleteAutosave,
  getAutosave,
  setAutosave,
  type AutosaveRecord,
} from '../utils/autosave';

interface AutosaveProps {
  children: React.ReactNode;
  enabled: boolean;
  instanceId: string;
  userId: string | number;
  model: string;
  documentId: string;
  locale?: string;
  baseVersion?: string;
}

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutosaveContextValue {
  clear: () => Promise<void>;
  pendingBaseVersion?: string;
}

const AutosaveContext = React.createContext<AutosaveContextValue>({
  clear: async () => undefined,
});

const Autosave = ({
  children,
  enabled,
  instanceId,
  userId,
  model,
  documentId,
  locale,
  baseVersion,
}: AutosaveProps) => {
  const { formatMessage, formatTime } = useIntl();
  const values = useForm('Autosave', (state) => state.values);
  const initialValues = useForm('Autosave', (state) => state.initialValues);
  const modified = useForm('Autosave', (state) => state.modified);
  const isSubmitting = useForm('Autosave', (state) => state.isSubmitting);
  const setValues = useForm('Autosave', (state) => state.setValues);
  const [status, setStatus] = React.useState<AutosaveStatus>('idle');
  const [savedAt, setSavedAt] = React.useState<string>();
  const [recovery, setRecovery] = React.useState<AutosaveRecord>();
  const [pendingBaseVersion, setPendingBaseVersion] = React.useState<string>();
  const loadedKey = React.useRef<string>();
  const wasModified = React.useRef(false);
  const writeGeneration = React.useRef(0);
  const timeoutRef = React.useRef<number>();
  const pendingWrite = React.useRef<Promise<unknown>>();

  const key = React.useMemo(
    () => createAutosaveKey({ instanceId, userId, model, documentId, locale }),
    [documentId, instanceId, locale, model, userId]
  );

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    loadedKey.current = undefined;
    setRecovery(undefined);
    setStatus('idle');

    getAutosave(key)
      .then((record) => {
        if (!active) {
          return;
        }

        loadedKey.current = key;

        if (record && JSON.stringify(record.data) !== JSON.stringify(initialValues)) {
          setRecovery(record);
        }
      })
      .catch(() => {
        if (active) {
          loadedKey.current = key;
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [baseVersion, enabled, initialValues, key]);

  React.useEffect(() => {
    if (!enabled || loadedKey.current !== key || !modified) {
      return;
    }

    const generation = writeGeneration.current;
    setStatus('saving');
    timeoutRef.current = window.setTimeout(
      () => {
        const nextSavedAt = new Date().toISOString();

        if (generation !== writeGeneration.current) {
          return;
        }

        pendingWrite.current = setAutosave({
          key,
          data: values,
          baseVersion: pendingBaseVersion ?? baseVersion,
          savedAt: nextSavedAt,
        })
          .then(() => {
            if (generation === writeGeneration.current) {
              setSavedAt(nextSavedAt);
              setStatus('saved');
            }
          })
          .catch(() => {
            if (generation === writeGeneration.current) {
              setStatus('error');
            }
          });
      },
      isSubmitting ? 0 : 1000
    );

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
  }, [baseVersion, enabled, isSubmitting, key, modified, pendingBaseVersion, values]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    if (modified) {
      wasModified.current = true;
      return;
    }

    if (wasModified.current) {
      wasModified.current = false;
      deleteAutosave(key).catch(() => undefined);
      setStatus('idle');
    }
  }, [enabled, key, modified]);

  const clear = React.useCallback(async () => {
    if (!enabled) {
      return;
    }

    writeGeneration.current += 1;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    try {
      await pendingWrite.current;
      await deleteAutosave(key);
      wasModified.current = false;
      setPendingBaseVersion(undefined);
      setRecovery(undefined);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [enabled, key]);

  const handleRestore = () => {
    if (recovery) {
      setValues(recovery.data);
      setSavedAt(recovery.savedAt);
      setPendingBaseVersion(recovery.baseVersion);
      setStatus('saved');
      setRecovery(undefined);
    }
  };

  const handleDiscard = () => {
    clear().catch(() => undefined);
  };

  return (
    <AutosaveContext.Provider value={{ clear, pendingBaseVersion }}>
      {enabled ? (
        <>
          <Box paddingBottom={2}>
            <Typography textColor={status === 'error' ? 'danger600' : 'neutral600'} variant="pi">
              {status === 'saving'
                ? formatMessage({
                    id: 'content-manager.autosave.saving',
                    defaultMessage: 'Saving local backup…',
                  })
                : null}
              {status === 'saved' && savedAt
                ? formatMessage(
                    {
                      id: 'content-manager.autosave.saved',
                      defaultMessage: 'Local backup saved at {time}',
                    },
                    { time: formatTime(savedAt, { hour: 'numeric', minute: '2-digit' }) }
                  )
                : null}
              {status === 'error'
                ? formatMessage({
                    id: 'content-manager.autosave.error',
                    defaultMessage: "Couldn't save a local backup",
                  })
                : null}
            </Typography>
          </Box>
          <Dialog.Root open={Boolean(recovery)} onOpenChange={(open) => !open && handleDiscard()}>
            <Dialog.Content>
              <Dialog.Header>
                {formatMessage({
                  id: 'content-manager.autosave.recovery.title',
                  defaultMessage: 'We recovered unsaved changes',
                })}
              </Dialog.Header>
              <Dialog.Body>
                <Typography>
                  {formatMessage({
                    id: 'content-manager.autosave.recovery.body',
                    defaultMessage:
                      'This browser has unsaved changes that differ from the saved document. Restore them?',
                  })}
                </Typography>
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={2} width="100%">
                  <Button variant="tertiary" fullWidth onClick={handleDiscard}>
                    {formatMessage({
                      id: 'content-manager.autosave.recovery.discard',
                      defaultMessage: 'Discard',
                    })}
                  </Button>
                  <Button fullWidth onClick={handleRestore}>
                    {formatMessage({
                      id: 'content-manager.autosave.recovery.restore',
                      defaultMessage: 'Restore',
                    })}
                  </Button>
                </Flex>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Root>
        </>
      ) : null}
      {children}
    </AutosaveContext.Provider>
  );
};

const useAutosave = () => React.useContext(AutosaveContext);

export { Autosave, useAutosave };
