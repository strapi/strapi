import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/getTranslation';

import type { RoleNamedBy } from '../../../../../shared/contracts/roles';

interface ConditionNamesListProps {
  names: string[];
}

/** The conditions a role's name is part of, one to a line */
const ConditionNamesList = ({ names }: ConditionNamesListProps) => (
  <Box tag="ul" paddingLeft={4} style={{ listStyle: 'disc' }}>
    {names.map((name) => (
      <Typography key={name} tag="li" fontWeight="bold">
        {name}
      </Typography>
    ))}
  </Box>
);

interface NamedByWarningProps {
  /** What is being done to the role */
  change: 'rename' | 'delete';
  /** The Who checks that name the role, from the server's answer for it */
  namedBy: RoleNamedBy[];
}

/**
 * What a rename or a delete does to the conditions whose Who checks name the role. The two kinds
 * of check go opposite ways: users of a role a check lists lose that condition, and users of a
 * role a check excludes are no longer excluded by it, so they may gain access.
 */
const NamedByWarning = ({ change, namedBy }: NamedByWarningProps) => {
  const { formatMessage } = useIntl();

  const names = (match: RoleNamedBy['match']) =>
    namedBy.filter((check) => check.match === match).map(({ displayName }) => displayName);
  const matching = names('any');
  const excluding = names('none');

  const values = (count: number) => ({ count });

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      {matching.length > 0 && (
        <>
          <Typography textColor="neutral600">
            {change === 'rename'
              ? formatMessage(
                  {
                    id: getTranslation('roles.rename.conditions-any'),
                    defaultMessage:
                      'Under the new name, users of this role stop matching {count, plural, one {this condition} other {these conditions}}:',
                  },
                  values(matching.length)
                )
              : formatMessage(
                  {
                    id: getTranslation('roles.delete.conditions-any'),
                    defaultMessage:
                      'Once it is deleted, its users stop matching {count, plural, one {this condition} other {these conditions}}:',
                  },
                  values(matching.length)
                )}
          </Typography>
          <ConditionNamesList names={matching} />
        </>
      )}
      {excluding.length > 0 && (
        <>
          <Typography textColor="neutral600">
            {change === 'rename'
              ? formatMessage(
                  {
                    id: getTranslation('roles.rename.conditions-none'),
                    defaultMessage:
                      'Under the new name, users of this role are no longer excluded by {count, plural, one {this condition} other {these conditions}}, so they may gain access:',
                  },
                  values(excluding.length)
                )
              : formatMessage(
                  {
                    id: getTranslation('roles.delete.conditions-none'),
                    defaultMessage:
                      'Once it is deleted, its users are no longer excluded by {count, plural, one {this condition} other {these conditions}}, so they may gain access:',
                  },
                  values(excluding.length)
                )}
          </Typography>
          <ConditionNamesList names={excluding} />
        </>
      )}
    </Flex>
  );
};

export { ConditionNamesList, NamedByWarning };
