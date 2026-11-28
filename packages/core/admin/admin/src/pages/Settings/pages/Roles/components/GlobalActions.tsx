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

import { UnheldPermissionTooltip } from './UnheldPermissionTooltip';

const EMPTY_ACTIONS: NonNullable<GlobalActionsProps['actions']> = [];

interface GlobalActionsProps {
  actions: Action[];
  isFormDisabled?: boolean;
  kind: Extract<keyof PermissionsDataManagerContextValue['modifiedData'], `${string}Types`>;
  /**
   * The uids of the content types a search lists. A column then shows and changes these only.
   * Every content type when absent.
   */
  listedSubjects?: string[];
}

const GlobalActions = ({
  actions = EMPTY_ACTIONS,
  isFormDisabled,
  kind,
  listedSubjects,
}: GlobalActionsProps) => {
  const { formatMessage } = useIntl();
  const { modifiedData, onChangeCollectionTypeGlobalActionCheckbox, checkUserHasPermission } =
    usePermissionsDataManager();

  const displayedActions = actions.filter(({ subjects }) => subjects && subjects.length);
  const listed = React.useMemo(
    () => (listedSubjects === undefined ? undefined : new Set(listedSubjects)),
    [listedSubjects]
  );

  const checkboxesState = React.useMemo(() => {
    const actionsIds = displayedActions.map(({ actionId }) => actionId);

    const data = modifiedData[kind];

    const relatedActionsData = actionsIds.reduce<Record<string, RecursiveRecordOfBooleans>>(
      (acc, actionId) => {
        Object.keys(data).forEach((ctUid) => {
          if (listed && !listed.has(ctUid)) {
            return;
          }

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
  }, [modifiedData, displayedActions, kind, listed]);

  return (
    <Box paddingBottom={4} paddingTop={6} style={{ paddingLeft: firstRowWidth }}>
      <Flex gap={0}>
        {displayedActions.map(({ label, actionId, subjects }) => {
          const allSubjects = subjects || [];
          // A search limits the column to the content types it lists
          const columnSubjects = listed
            ? allSubjects.filter((subject) => listed.has(subject))
            : allSubjects;
          const userHasPermissionForAll =
            columnSubjects.length > 0 &&
            columnSubjects.every((subject) => checkUserHasPermission(actionId, subject));
          const actionLabel = formatMessage({
            id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
            defaultMessage: label,
          });

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
                {actionLabel}
              </Typography>
              <UnheldPermissionTooltip
                isFormDisabled={isFormDisabled}
                // A column no listed content type has the action in is off, not out of the user's reach
                userHasPermission={userHasPermissionForAll || columnSubjects.length === 0}
              >
                <Checkbox
                  disabled={isFormDisabled || !userHasPermissionForAll}
                  onCheckedChange={(value) => {
                    onChangeCollectionTypeGlobalActionCheckbox(kind, actionId, !!value, {
                      // The content types that have the action and are listed
                      subjects: columnSubjects.filter((subject) => subject in modifiedData[kind]),
                      label: actionLabel,
                      filtered: listed !== undefined,
                    });
                  }}
                  name={actionId}
                  aria-label={formatMessage(
                    {
                      id: `Settings.permissions.select-all-by-permission`,
                      defaultMessage: 'Select all {label} permissions',
                    },
                    { label: actionLabel }
                  )}
                  checked={
                    get(checkboxesState, [actionId, 'hasSomeActionsSelected'], false)
                      ? 'indeterminate'
                      : get(checkboxesState, [actionId, 'hasAllActionsSelected'], false)
                  }
                />
              </UnheldPermissionTooltip>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
};

export { GlobalActions };
export type { GlobalActionsProps };
