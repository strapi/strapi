import * as React from 'react';

import { Checkbox, Box, Flex, Typography } from '@strapi/design-system';
import get from 'lodash/get';
import { useIntl } from 'react-intl';

import { Action } from '../../../../../../../shared/contracts/permissions';
import {
  PermissionsDataManagerContextValue,
  usePermissionsDataManager,
} from '../hooks/usePermissionsDataManager';
import { cellWidth, firstRowWidth } from '../utils/constants';
import { RecursiveRecordOfBooleans, getCheckboxState } from '../utils/getCheckboxState';
import { removeConditionKeyFromData } from '../utils/removeConditionKeyFromData';

interface GlobalActionsProps {
  actions: Action[];
  isFormDisabled?: boolean;
  kind: Extract<keyof PermissionsDataManagerContextValue['modifiedData'], `${string}Types`>;
}

const GlobalActions = ({ actions = [], isFormDisabled, kind }: GlobalActionsProps) => {
  const { formatMessage } = useIntl();
  const { modifiedData, onChangeCollectionTypeGlobalActionCheckbox } = usePermissionsDataManager();

  const displayedActions = actions.filter(({ subjects }) => subjects && subjects.length);

  const checkboxesState = React.useMemo(() => {
    const actionsIds = displayedActions.map(({ actionId }) => actionId);

    const data = modifiedData[kind];

    const relatedActionsData = actionsIds.reduce<Record<string, RecursiveRecordOfBooleans>>(
      (acc, actionId) => {
        Object.keys(data).forEach((ctUid) => {
          const actionIdData = get(data, [ctUid, actionId]);

          const actionIdState = { [ctUid]: removeConditionKeyFromData(actionIdData)! };

          if (!acc[actionId]) {
            acc[actionId] = actionIdState;
          } else {
            acc[actionId] = { ...acc[actionId], ...actionIdState };
          }
        });

        return acc;
      },
      {}
    );

    const checkboxesState = Object.keys(relatedActionsData).reduce<
      Record<
        string,
        {
          hasAllActionsSelected: boolean;
          hasSomeActionsSelected: boolean;
        }
      >
    >((acc, current) => {
      acc[current] = getCheckboxState(relatedActionsData[current]);

      return acc;
    }, {});

    return checkboxesState;
  }, [modifiedData, displayedActions, kind]);

  return (
    <Box paddingBottom={4} paddingTop={6} style={{ paddingLeft: firstRowWidth }}>
      <Flex gap={0}>
        {displayedActions.map(({ label, actionId }) => {
          return (
            <Flex
              shrink={0}
              width={cellWidth}
              direction="column"
              alignItems="center"
              justifyContent="center"
              key={actionId}
              gap={3}
            >
              <Typography variant="sigma" textColor="neutral500">
                {formatMessage({
                  id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
                  defaultMessage: label,
                })}
              </Typography>
              <Checkbox
                disabled={isFormDisabled}
                onCheckedChange={(value) => {
                  onChangeCollectionTypeGlobalActionCheckbox(kind, actionId, !!value);
                }}
                name={actionId}
                aria-label={formatMessage(
                  {
                    id: `Settings.permissions.select-all-by-permission`,
                    defaultMessage: 'Select all {label} permissions',
                  },
                  {
                    label: formatMessage({
                      id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
                      defaultMessage: label,
                    }),
                  }
                )}
                checked={
                  get(checkboxesState, [actionId, 'hasSomeActionsSelected'], false)
                    ? 'indeterminate'
                    : get(checkboxesState, [actionId, 'hasAllActionsSelected'], false)
                }
              />
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
};

export { GlobalActions };
export type { GlobalActionsProps };
