import * as React from 'react';

import { useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';
import { Button } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { useImportRoleMutation } from '../../../services/roles';
import { getTranslation } from '../../../utils/getTranslation';

import type { RoleFile } from '../../../../../shared/contracts/roles';

/** `Blob.text()` is not in jsdom, which the component tests run in; `FileReader` is everywhere. */
const readAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

/**
 * Picks a `.json` file an export wrote and creates a role from it. The server checks the file
 * and answers the new role, whose edit page opens next.
 */
const ImportRoleButton = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [importRole, { isLoading }] = useImportRoleMutation();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    // Forget the choice, so the same file picked again (after a fix) still fires a change
    input.value = '';

    if (!file) {
      return;
    }

    let roleFile: RoleFile;

    try {
      roleFile = JSON.parse(await readAsText(file));
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslation('roles.import.invalid'),
          defaultMessage: 'That file is not a role file: it is not valid JSON.',
        }),
      });

      return;
    }

    const result = await importRole(roleFile);

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatAPIError(result.error) });

      return;
    }

    navigate(result.data.documentId);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="S"
        loading={isLoading}
        onClick={() => inputRef.current?.click()}
      >
        {formatMessage({ id: getTranslation('roles.import'), defaultMessage: 'Import' })}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label={formatMessage({
          id: getTranslation('roles.import.file'),
          defaultMessage: 'Role file',
        })}
        onChange={handleChange}
      />
    </>
  );
};

export { ImportRoleButton };
