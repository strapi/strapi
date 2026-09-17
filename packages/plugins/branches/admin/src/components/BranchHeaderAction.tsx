import { Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { MAIN_SLUG } from '../constants';
import { useGetBranchStatesQuery } from '../services/branches';
import { getTranslation } from '../utils/getTranslation';
import { BranchDot } from './BranchDot';
import { useBranches } from './useBranches';

import type { HeaderActionComponent } from '@strapi/content-manager/strapi-admin';

/**
 * Edit-view header picker (same seam as i18n's locale picker). The trigger
 * shows the branch and, for an existing document, its state on the branch
 * (new / modified / same as the parent).
 */
export const BranchHeaderAction: HeaderActionComponent = ({ documentId, model }) => {
  const { formatMessage } = useIntl();
  const { branches, others, current, isOnMain, parentOf, switchBranch } = useBranches();
  const { data: states } = useGetBranchStatesQuery(
    { contentType: model, documentIds: documentId ? [documentId] : [] },
    { skip: !documentId || isOnMain }
  );

  if (others.length === 0) {
    return null;
  }

  const parent = parentOf(current);
  const state = documentId ? states?.[documentId]?.state : undefined;
  const stateLabel =
    !isOnMain && state && current
      ? formatMessage(
          {
            id: getTranslation(`status.${state}`),
            defaultMessage:
              state === 'created'
                ? 'New on {branch}'
                : state === 'modified'
                  ? 'Modified on {branch}'
                  : state === 'deleted'
                    ? 'Deleted on {branch}'
                    : 'Same as {parent}',
          },
          { branch: current.name, parent: parent?.name ?? 'Main' }
        )
      : null;

  return {
    label: formatMessage({ id: getTranslation('picker.label'), defaultMessage: 'Branch' }),
    value: current?.slug ?? MAIN_SLUG,
    options: branches.map((branch) => ({
      value: branch.slug,
      label:
        branch.slug === MAIN_SLUG
          ? formatMessage({ id: getTranslation('picker.main'), defaultMessage: 'Main' })
          : branch.name,
      startIcon: <BranchDot color={branch.color} />,
    })),
    onSelect: (value: string) => switchBranch(value),
    customizeContent: (value: string) => {
      const branch = branches.find((candidate) => candidate.slug === value);
      return (
        <Flex gap={2} alignItems="center">
          <BranchDot color={branch?.color ?? null} />
          <Typography ellipsis>{branch?.name ?? value}</Typography>
          {stateLabel ? (
            <Typography variant="pi" textColor="neutral600" ellipsis>
              · {stateLabel}
            </Typography>
          ) : null}
        </Flex>
      );
    },
  };
};
