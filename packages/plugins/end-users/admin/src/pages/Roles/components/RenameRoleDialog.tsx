import * as React from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Dialog, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/getTranslation';

import { NamedByWarning } from './ConditionNamesList';

import type { RoleNamedBy } from '../../../../../shared/contracts/roles';

/** The rename a save is about to make, and the Who checks that name the role */
interface RenameQuestion {
  from: string;
  to: string;
  /** The Who checks that name the role, as the server computed them */
  namedBy: RoleNamedBy[];
}

interface RenameRoleDialogProps {
  /** The rename to ask about. The dialog is open while there is one. */
  question: RenameQuestion | null;
  onAnswer: (confirmed: boolean) => void;
}

/**
 * Asks before a save renames a role that conditions name: their checks match roles by name, so
 * the checks no longer reach it (a check that excludes it stops excluding). Nothing is sent before the answer.
 */
const RenameRoleDialog = ({ question, onAnswer }: RenameRoleDialogProps) => {
  const { formatMessage } = useIntl();

  return (
    // Closing the dialog any other way than Confirm is a refusal
    <Dialog.Root open={question !== null} onOpenChange={(isOpen) => !isOpen && onAnswer(false)}>
      {question && (
        <ConfirmDialog variant="default" onConfirm={() => onAnswer(true)}>
          <Flex direction="column" alignItems="stretch" gap={2}>
            <Typography>
              {formatMessage(
                {
                  id: getTranslation('roles.rename.question'),
                  defaultMessage: 'Rename <b>{from}</b> to <b>{to}</b>?',
                },
                {
                  from: question.from,
                  to: question.to,
                  b: (chunks: React.ReactNode) => (
                    <Typography fontWeight="bold">{chunks}</Typography>
                  ),
                }
              )}
            </Typography>
            <NamedByWarning change="rename" namedBy={question.namedBy} />
          </Flex>
        </ConfirmDialog>
      )}
    </Dialog.Root>
  );
};

export { RenameRoleDialog };
export type { RenameQuestion, RenameRoleDialogProps };
