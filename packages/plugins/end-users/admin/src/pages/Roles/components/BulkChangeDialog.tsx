import * as React from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Dialog, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/getTranslation';

import type { PermissionsProps } from '@strapi/admin/strapi-admin';

/** The change of a column of the editor, as the editor asks about it */
type BulkChange = Parameters<NonNullable<PermissionsProps['confirmBulkChange']>>[0];

/** The change to ask about: only the content types it changes, and how many already had it */
type BulkQuestion = BulkChange & { unchanged: number };

interface BulkChangeDialogProps {
  /** The change to ask about. The dialog is open while there is one. */
  change: BulkQuestion | null;
  onAnswer: (confirmed: boolean) => void;
}

/**
 * Asks before a whole column of the editor is ticked or unticked: a click on "select all" is the
 * one change that touches many content types at once. Nothing has changed yet when it asks, and
 * every change is listed again when the role is saved.
 */
const BulkChangeDialog = ({ change, onAnswer }: BulkChangeDialogProps) => {
  const { formatMessage } = useIntl();

  const bold = (chunks: React.ReactNode) => <Typography fontWeight="bold">{chunks}</Typography>;

  return (
    // Closing the dialog any other way than Confirm is a refusal
    <Dialog.Root open={change !== null} onOpenChange={(isOpen) => !isOpen && onAnswer(false)}>
      {change && (
        <ConfirmDialog variant="default" onConfirm={() => onAnswer(true)}>
          <Flex direction="column" alignItems="stretch" gap={2}>
            <Typography>
              {formatMessage(
                change.value
                  ? {
                      id: getTranslation('roles.bulk.grant'),
                      defaultMessage:
                        'Grant <b>{label}</b> on <b>{count}</b>{more, select, yes { more} other {}} {kind}{filtered, select, yes { matching your search} other {}}?',
                    }
                  : {
                      id: getTranslation('roles.bulk.remove'),
                      defaultMessage:
                        'Remove <b>{label}</b> from <b>{count}</b> {kind}{filtered, select, yes { matching your search} other {}}?',
                    },
                {
                  label: change.label,
                  count: change.subjects.length,
                  more: change.unchanged > 0 ? 'yes' : 'no',
                  kind:
                    change.tab === 'singleTypes'
                      ? formatMessage({
                          id: getTranslation('roles.bulk.single-types'),
                          defaultMessage: 'single types',
                        })
                      : formatMessage({
                          id: getTranslation('roles.bulk.collection-types'),
                          defaultMessage: 'collection types',
                        }),
                  filtered: change.filtered ? 'yes' : 'no',
                  b: bold,
                }
              )}
            </Typography>
            <Typography textColor="neutral600">
              {formatMessage({
                id: getTranslation('roles.bulk.review'),
                defaultMessage: "You'll review every change before saving.",
              })}
            </Typography>
          </Flex>
        </ConfirmDialog>
      )}
    </Dialog.Root>
  );
};

export { BulkChangeDialog };
export type { BulkChange, BulkChangeDialogProps, BulkQuestion };
