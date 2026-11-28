import * as React from 'react';

import {
  ConfirmDialog,
  useAPIErrorHandler,
  useClipboard,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import { Alert, Box, Button, Dialog, Flex, Loader, Typography } from '@strapi/design-system';
import { Duplicate } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { PERMISSIONS } from '../../constants';
import { useGetProjectFilesQuery, useWriteProjectFilesMutation } from '../../services/migration';
import { getTranslation } from '../../utils/getTranslation';

import type { ProjectFiles as ProjectFilesPlan } from '../../../../shared/contracts/migration';

const REASONS: Record<
  NonNullable<ProjectFilesPlan['reason']>,
  { id: string; defaultMessage: string }
> = {
  'not-development': {
    id: 'migration.files.reason.not-development',
    defaultMessage:
      'The files are written only by a development server (strapi develop). Make these changes in your repository and deploy it.',
  },
  'no-source': {
    id: 'migration.files.reason.no-source',
    defaultMessage:
      'This project has no src folder here, so its files cannot be planned. Make the changes by hand.',
  },
  'config-not-editable': {
    id: 'migration.files.reason.config-not-editable',
    defaultMessage:
      'The config/plugins.ts file cannot be edited automatically. Add the block above by hand.',
  },
};

const Code = ({ children }: { children: string }) => (
  <Box tag="pre" background="neutral100" padding={3} hasRadius overflow="auto" maxHeight="320px">
    <Typography tag="code" variant="pi" textColor="neutral800">
      {children}
    </Typography>
  </Box>
);

const CopyBlock = ({
  title,
  copyLabel,
  text,
}: {
  title: string;
  copyLabel: string;
  text: string;
}) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { copy } = useClipboard();

  const handleCopy = async () => {
    const copied = await copy(text);

    if (copied) {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('migration.files.copied'),
          defaultMessage: 'Copied',
        }),
      });
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Flex justifyContent="space-between" alignItems="center" gap={2}>
        <Typography fontWeight="bold">{title}</Typography>
        <Button
          type="button"
          variant="tertiary"
          size="S"
          startIcon={<Duplicate />}
          aria-label={copyLabel}
          onClick={handleCopy}
        >
          {formatMessage({ id: getTranslation('migration.files.copy'), defaultMessage: 'Copy' })}
        </Button>
      </Flex>
      <Code>{text}</Code>
    </Flex>
  );
};

/**
 * What the project changes to move from Users & Permissions: its files, the config block and the
 * line that turns the old plugin off, and the code that names the old plugin. On a development
 * server that reloads, the files can be written from here; anywhere else the project makes the
 * changes through its repository.
 */
const ProjectFiles = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { data, isLoading, error } = useGetProjectFilesQuery();
  const [writeFiles] = useWriteProjectFilesMutation();
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isErrorDismissed, setIsErrorDismissed] = React.useState(false);
  const {
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS.settings);

  if (isLoading) {
    return (
      <Loader small>{formatMessage({ id: 'global.loading', defaultMessage: 'Loading' })}</Loader>
    );
  }

  if (error || !data) {
    return isErrorDismissed ? null : (
      <Alert
        variant="danger"
        onClose={() => setIsErrorDismissed(true)}
        closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
      >
        {formatMessage({
          id: getTranslation('migration.files.error'),
          defaultMessage: 'The project files could not be planned.',
        })}
      </Alert>
    );
  }

  const handleWrite = async () => {
    const result = await writeFiles();

    setIsConfirming(false);

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatAPIError(result.error) });

      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: getTranslation('migration.files.written'),
        defaultMessage:
          'The files are written. Strapi is restarting; reload this page when it is back.',
      }),
    });
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography variant="delta" tag="h3">
        {formatMessage({
          id: getTranslation('migration.files.title'),
          defaultMessage: 'Project files',
        })}
      </Typography>

      {data.changes.length > 0 && (
        <Flex direction="column" alignItems="stretch" gap={4}>
          {data.changes.map((change) => (
            <Flex key={change.path} direction="column" alignItems="stretch" gap={2}>
              <Typography fontWeight="bold">{change.path}</Typography>
              <Flex alignItems="flex-start" gap={4}>
                <Box flex="1" minWidth={0}>
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({
                      id: getTranslation('migration.files.before'),
                      defaultMessage: 'Before',
                    })}
                  </Typography>
                  {change.before === null ? (
                    <Typography tag="p" textColor="neutral600">
                      {formatMessage({
                        id: getTranslation('migration.files.new-file'),
                        defaultMessage: 'The file does not exist yet',
                      })}
                    </Typography>
                  ) : (
                    <Code>{change.before}</Code>
                  )}
                </Box>
                <Box flex="1" minWidth={0}>
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({
                      id: getTranslation('migration.files.after'),
                      defaultMessage: 'After',
                    })}
                  </Typography>
                  {change.after === null ? (
                    <Typography tag="p" textColor="neutral600">
                      {formatMessage({
                        id: getTranslation('migration.files.deleted'),
                        defaultMessage: 'The file is deleted',
                      })}
                    </Typography>
                  ) : (
                    <Code>{change.after}</Code>
                  )}
                </Box>
              </Flex>
            </Flex>
          ))}
        </Flex>
      )}

      <CopyBlock
        title={formatMessage({
          id: getTranslation('migration.files.config-block'),
          defaultMessage: 'Add to config/plugins.ts',
        })}
        copyLabel={formatMessage({
          id: getTranslation('migration.files.config-block.copy'),
          defaultMessage: 'Copy the config block',
        })}
        text={data.configBlock}
      />
      <CopyBlock
        title={formatMessage({
          id: getTranslation('migration.files.up-line'),
          defaultMessage: 'Turn Users & Permissions off',
        })}
        copyLabel={formatMessage({
          id: getTranslation('migration.files.up-line.copy'),
          defaultMessage: 'Copy the Users & Permissions line',
        })}
        text={data.usersPermissionsLine}
      />

      {data.findings.length > 0 && (
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography fontWeight="bold">
            {formatMessage({
              id: getTranslation('migration.files.findings'),
              defaultMessage: 'Code to change by hand',
            })}
          </Typography>
          {data.findings.map((finding) => (
            <Typography
              key={`${finding.path}:${finding.line ?? 0}:${finding.rule}:${finding.message}`}
              tag="p"
              textColor="neutral800"
            >
              {`${finding.path}${finding.line === null ? '' : `:${finding.line}`}: ${finding.message}`}
            </Typography>
          ))}
        </Flex>
      )}

      {data.writable && canUpdate ? (
        <Flex>
          <Button type="button" onClick={() => setIsConfirming(true)}>
            {formatMessage({
              id: getTranslation('migration.files.write'),
              defaultMessage: 'Write the files',
            })}
          </Button>
        </Flex>
      ) : (
        data.reason && (
          <Typography textColor="neutral600">
            {formatMessage({
              id: getTranslation(REASONS[data.reason].id),
              defaultMessage: REASONS[data.reason].defaultMessage,
            })}
          </Typography>
        )
      )}

      <Dialog.Root open={isConfirming} onOpenChange={setIsConfirming}>
        <ConfirmDialog onConfirm={handleWrite} variant="default">
          <Typography>
            {formatMessage({
              id: getTranslation('migration.files.write.question'),
              defaultMessage:
                'Write the files? Strapi restarts, and the restart migrates this development database from Users & Permissions to End users.',
            })}
          </Typography>
        </ConfirmDialog>
      </Dialog.Root>
    </Flex>
  );
};

export { ProjectFiles };
