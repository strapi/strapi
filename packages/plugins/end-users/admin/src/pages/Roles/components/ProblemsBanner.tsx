import { Button, Flex, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/getTranslation';

import type { PermissionProblem } from '../../../../../shared/contracts/roles';

interface ProblemsBannerProps {
  /** The stored rows the server now refuses, as the role came with them */
  problems: PermissionProblem[];
  /** The ids of the rows the admin has already asked to remove with the next save */
  removing: string[];
  /** Asks for these rows to be removed with the next save */
  onRemove: (documentIds: string[]) => void;
  disabled?: boolean;
}

/**
 * The stored rows the editor sets aside because the server now refuses them (a condition that was
 * deleted, a field that no longer exists). Saving leaves them as they are; "Remove them" is how
 * they go.
 */
const ProblemsBanner = ({ problems, removing, onRemove, disabled }: ProblemsBannerProps) => {
  const { formatMessage } = useIntl();

  if (problems.length === 0) {
    return null;
  }

  const removable = problems.flatMap(({ documentId }) => (documentId === null ? [] : [documentId]));
  const isRemoving = removable.length > 0 && removable.every((id) => removing.includes(id));

  return (
    <Flex
      role="alert"
      alignItems="flex-start"
      gap={3}
      padding={4}
      background="warning100"
      borderColor="warning200"
      hasRadius
    >
      <WarningCircle width="1.6rem" height="1.6rem" fill="warning600" />
      <Flex direction="column" alignItems="stretch" gap={2} flex={1}>
        <Typography fontWeight="bold" textColor="neutral800">
          {formatMessage(
            {
              id: getTranslation('roles.edit.problems.title'),
              defaultMessage:
                '{count, plural, one {# permission of this role is refused by the server} other {# permissions of this role are refused by the server}}',
            },
            { count: problems.length }
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral800">
          {isRemoving
            ? formatMessage({
                id: getTranslation('roles.edit.problems.removing'),
                defaultMessage: 'They are removed when you save.',
              })
            : formatMessage({
                id: getTranslation('roles.edit.problems.body'),
                defaultMessage: 'Saving leaves them as they are. They are not shown in the editor.',
              })}
        </Typography>
        <Flex tag="ul" direction="column" alignItems="stretch" gap={1}>
          {problems.map(({ documentId, action, reason }, position) => (
            <Typography tag="li" key={documentId ?? position} variant="pi" textColor="neutral800">
              <Typography variant="pi" fontWeight="bold">
                {action}
              </Typography>
              {`: ${reason}`}
            </Typography>
          ))}
        </Flex>
        {!isRemoving && removable.length > 0 && (
          <Flex>
            <Button
              variant="secondary"
              size="S"
              disabled={disabled}
              onClick={() => onRemove(removable)}
            >
              {formatMessage({
                id: getTranslation('roles.edit.problems.remove'),
                defaultMessage: 'Remove them',
              })}
            </Button>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};

export { ProblemsBanner };
export type { ProblemsBannerProps };
