import * as React from 'react';

import { useForm } from '@strapi/admin/strapi-admin';
import { Box, Button, Dialog, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import {
  useDeleteAutosaveMutation,
  useLazyGetAutosaveQuery,
  useSaveAutosaveMutation,
} from '../../../services/autosave';
import {
  createAutosaveKey,
  deleteAutosave,
  evictAutosavesOverQuota,
  getAutosave,
  registerAutosaveOwner,
  setAutosave,
  supportsServerAutosave,
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
  const setValues = useForm('Autosave', (state) => state.setValues);
  const [status, setStatus] = React.useState<AutosaveStatus>('idle');
  const [savedAt, setSavedAt] = React.useState<string>();
  const [recovery, setRecovery] = React.useState<AutosaveRecord>();
  const [pendingBaseVersion, setPendingBaseVersion] = React.useState<string>();
  const [loadedKey, setLoadedKey] = React.useState<string>();
  const wasModified = React.useRef(false);
  const writesSuspended = React.useRef(false);
  const writeGeneration = React.useRef(0);
  const timeoutRef = React.useRef<number>();
  const pendingWrite = React.useRef<Promise<unknown>>();

  const [fetchServerAutosave] = useLazyGetAutosaveQuery();
  const [saveServerAutosave] = useSaveAutosaveMutation();
  const [deleteServerAutosave] = useDeleteAutosaveMutation();

  const key = React.useMemo(
    () => createAutosaveKey({ instanceId, userId, model, documentId, locale }),
    [documentId, instanceId, locale, model, userId]
  );

  // The browser backup covers crashes and offline edits; the server backup covers a different
  // device or cleared site data. A document that does not exist yet only has the former.
  const onServer = supportsServerAutosave(documentId);
  const serverParams = React.useMemo(
    () => ({ model, documentId, locale }),
    [documentId, locale, model]
  );

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    setLoadedKey(undefined);
    setRecovery(undefined);
    setStatus('idle');
    registerAutosaveOwner({ instanceId, userId });

    const readServer = async (): Promise<AutosaveRecord | undefined> => {
      if (!onServer) {
        return undefined;
      }

      const response = await fetchServerAutosave(serverParams).unwrap();

      return response.data
        ? {
            key,
            data: response.data.data,
            baseVersion: response.data.baseVersion ?? undefined,
            savedAt: response.data.savedAt,
          }
        : undefined;
    };

    Promise.allSettled([getAutosave(key), readServer()]).then((results) => {
      if (!active) {
        return;
      }

      setLoadedKey(key);

      if (results.every(({ status: state }) => state === 'rejected')) {
        setStatus('error');
        return;
      }

      const serialisedInitialValues = JSON.stringify(initialValues);
      const [newest] = results
        .flatMap((result) => (result.status === 'fulfilled' && result.value ? [result.value] : []))
        .filter((record) => JSON.stringify(record.data) !== serialisedInitialValues)
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt));

      if (newest) {
        setRecovery(newest);
      }
    });

    return () => {
      active = false;
    };
  }, [
    baseVersion,
    enabled,
    fetchServerAutosave,
    initialValues,
    instanceId,
    key,
    onServer,
    serverParams,
    userId,
  ]);

  React.useEffect(() => {
    if (!enabled || loadedKey !== key || !modified || writesSuspended.current) {
      return;
    }

    const generation = writeGeneration.current;
    setStatus('saving');
    timeoutRef.current = window.setTimeout(() => {
      const nextSavedAt = new Date().toISOString();

      if (generation !== writeGeneration.current) {
        return;
      }

      const effectiveBaseVersion = pendingBaseVersion ?? baseVersion;
      const writes: Promise<unknown>[] = [
        setAutosave({
          key,
          data: values,
          baseVersion: effectiveBaseVersion,
          savedAt: nextSavedAt,
        }).then(() =>
          // Trimming is a storage concern, not part of this backup: a failure here must not
          // report the backup as lost, and the document being edited is never evicted.
          evictAutosavesOverQuota({ protectedKey: key }).catch(() => undefined)
        ),
      ];

      if (onServer) {
        writes.push(
          saveServerAutosave({
            ...serverParams,
            data: { data: values, baseVersion: effectiveBaseVersion },
          }).unwrap()
        );
      }

      // One store being unavailable — private browsing, or an offline editor — still leaves
      // the work backed up somewhere, so only a total failure is worth reporting.
      pendingWrite.current = Promise.allSettled(writes).then((results) => {
        if (generation !== writeGeneration.current) {
          return;
        }

        if (results.some(({ status: state }) => state === 'fulfilled')) {
          setSavedAt(nextSavedAt);
          setStatus('saved');
        } else {
          setStatus('error');
        }
      });
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
  }, [
    baseVersion,
    enabled,
    key,
    loadedKey,
    modified,
    onServer,
    pendingBaseVersion,
    saveServerAutosave,
    serverParams,
    values,
  ]);

  const removeBackups = React.useCallback(async () => {
    // A leftover server backup is harmless — it only resurfaces when it differs from the saved
    // document — so failing to reach the server must not report the local backup as broken.
    const server = onServer
      ? deleteServerAutosave(serverParams)
          .unwrap()
          .catch(() => undefined)
      : Promise.resolve();

    await Promise.all([deleteAutosave(key), server]);
  }, [deleteServerAutosave, key, onServer, serverParams]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    if (modified) {
      wasModified.current = true;
      return;
    }

    if (wasModified.current) {
      writesSuspended.current = false;
      wasModified.current = false;
      removeBackups().catch(() => undefined);
      setStatus('idle');
    }
  }, [enabled, modified, removeBackups]);

  const clear = React.useCallback(async () => {
    if (!enabled) {
      return;
    }

    writeGeneration.current += 1;
    writesSuspended.current = modified;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    try {
      await pendingWrite.current;
      await removeBackups();
      wasModified.current = false;
      setPendingBaseVersion(undefined);
      setRecovery(undefined);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [enabled, modified, removeBackups]);

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
                    defaultMessage: 'Saving backup…',
                  })
                : null}
              {status === 'saved' && savedAt
                ? formatMessage(
                    {
                      id: 'content-manager.autosave.saved',
                      defaultMessage: 'Backup saved at {time}',
                    },
                    { time: formatTime(savedAt, { hour: 'numeric', minute: '2-digit' }) }
                  )
                : null}
              {status === 'error'
                ? formatMessage({
                    id: 'content-manager.autosave.error',
                    defaultMessage: "Couldn't save a backup",
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
                      'You have unsaved changes that differ from the saved document. Restore them?',
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
