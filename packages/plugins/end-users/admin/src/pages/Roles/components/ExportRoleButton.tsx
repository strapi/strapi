import { useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';
import { Button } from '@strapi/design-system';
import { Download } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useLazyGetRoleFileQuery } from '../../../services/roles';
import { getTranslation } from '../../../utils/getTranslation';

import type { RoleDetail } from '../../../../../shared/contracts/roles';

/** `Premium member` is saved as `premium-member.role.json` */
const toFileName = (name: string) => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'role'}.role.json`;
};

const download = (file: Blob, fileName: string) => {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  // In the document for the click and revoked on a later turn: some browsers cancel a click on a
  // detached anchor, or a download whose URL is already gone
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

interface ExportRoleButtonProps {
  role: Pick<RoleDetail, 'documentId' | 'name'>;
}

/**
 * Saves the role as the file an import reads back. It is the role as stored, not the edits being
 * made on the page.
 */
const ExportRoleButton = ({ role }: ExportRoleButtonProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [getRoleFile, { isFetching }] = useLazyGetRoleFileQuery();

  const handleClick = async () => {
    // The file is fetched each time: a copy kept from an earlier export may be out of date
    const result = await getRoleFile(role.documentId, false);

    if (result.isError || !result.data) {
      toggleNotification({
        type: 'danger',
        message: result.error
          ? formatAPIError(result.error)
          : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });

      return;
    }

    download(
      new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' }),
      toFileName(role.name)
    );
  };

  return (
    <Button variant="secondary" startIcon={<Download />} loading={isFetching} onClick={handleClick}>
      {formatMessage({ id: getTranslation('roles.edit.export'), defaultMessage: 'Export' })}
    </Button>
  );
};

export { ExportRoleButton };
