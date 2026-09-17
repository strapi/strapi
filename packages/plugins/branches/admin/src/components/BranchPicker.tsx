import { Flex, IconButton, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { Stack } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { BRANCHES_PATH, MAIN_SLUG } from '../constants';
import { getTranslation } from '../utils/getTranslation';
import { BranchDot } from './BranchDot';
import { useBranches } from './useBranches';

/**
 * Branch picker mounted in the Content Manager list view toolbar (the
 * `listView.actions` injection zone, next to i18n's locale picker), with a
 * shortcut to the branch pages. The select only shows once a branch exists.
 */
export const BranchPicker = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { branches, others, current, switchBranch } = useBranches();

  return (
    <Flex gap={2} alignItems="center">
      {others.length > 0 ? (
        <SingleSelect
          size="S"
          aria-label={formatMessage({
            id: getTranslation('picker.select'),
            defaultMessage: 'Select a branch',
          })}
          value={current?.slug ?? MAIN_SLUG}
          onChange={(value) => switchBranch(String(value))}
          customizeContent={(value) =>
            value === MAIN_SLUG
              ? formatMessage({ id: getTranslation('picker.main'), defaultMessage: 'Main' })
              : (branches.find((candidate) => candidate.slug === value)?.name ?? String(value))
          }
        >
          {branches.map((branch) => (
            <SingleSelectOption
              key={branch.slug}
              value={branch.slug}
              startIcon={<BranchDot color={branch.color} />}
            >
              {branch.slug === MAIN_SLUG
                ? formatMessage({ id: getTranslation('picker.main'), defaultMessage: 'Main' })
                : branch.name}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      ) : null}
      <IconButton
        variant="tertiary"
        label={formatMessage({
          id: getTranslation('picker.manage'),
          defaultMessage: 'Manage branches',
        })}
        onClick={() => navigate(BRANCHES_PATH)}
      >
        <Stack />
      </IconButton>
    </Flex>
  );
};
