import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Modal,
  MultiSelect,
  MultiSelectGroup,
  MultiSelectOption,
  MultiSelectProps,
  Typography,
  Breadcrumbs,
  Crumb,
} from '@strapi/design-system';
import { produce } from 'immer';
import get from 'lodash/get';
import groupBy from 'lodash/groupBy';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { capitalise } from '../../../../../utils/strings';
import {
  PermissionsDataManagerContextValue,
  usePermissionsDataManager,
} from '../hooks/usePermissionsDataManager';

import type { HiddenCheckboxAction, VisibleCheckboxAction } from './ContentTypeCollapses';
import type { ConditionForm } from '../utils/forms';

/* -------------------------------------------------------------------------------------------------
 * ConditionsModal
 * -----------------------------------------------------------------------------------------------*/

interface ConditionAction extends Pick<ActionRowProps, 'label'> {
  actionId: string;
  isDisplayed: boolean;
  hasSomeActionsSelected?: boolean;
  hasAllActionsSelected?: boolean;
  pathToConditionsObject: string[];
}

interface ConditionsModalProps extends Pick<ActionRowProps, 'isFormDisabled'> {
  actions?: Array<ConditionAction | HiddenCheckboxAction | VisibleCheckboxAction>;
  headerBreadCrumbs?: string[];
  isReadOnly?: boolean;
  onClose?: () => void;
}

const ConditionsModal = ({
  actions = [],
  headerBreadCrumbs = [],
  isFormDisabled,
  isReadOnly = false,
  onClose,
}: ConditionsModalProps) => {
  const { formatMessage } = useIntl();
  const { availableConditions, modifiedData, onChangeConditions, getAllowedConditions } =
    usePermissionsDataManager();

  const arrayOfOptionsGroupedByCategory = React.useMemo(() => {
    return Object.entries(groupBy(availableConditions, 'category'));
  }, [availableConditions]);

  const actionsToDisplay = React.useMemo(
    () =>
      actions.filter<VisibleCheckboxAction | ConditionAction>(
        // @ts-expect-error – TODO: fix this type issue
        ({ isDisplayed, hasSomeActionsSelected, hasAllActionsSelected }) =>
          isDisplayed && Boolean(hasSomeActionsSelected || hasAllActionsSelected)
      ),
    [actions]
  );

  const [state, setState] = React.useState(() =>
    createDefaultConditionsForm(actionsToDisplay, modifiedData, arrayOfOptionsGroupedByCategory)
  );

  // Keep the form in sync with conditions set outside the modal, e.g. filled in from the user's
  // own conditions when a permission is ticked. The inputs only change while the modal is closed.
  React.useEffect(() => {
    setState(
      createDefaultConditionsForm(actionsToDisplay, modifiedData, arrayOfOptionsGroupedByCategory)
    );
  }, [actionsToDisplay, modifiedData, arrayOfOptionsGroupedByCategory]);

  const handleChange = React.useCallback(
    (name: string, values: ConditionForm) => {
      if (isReadOnly === true) {
        return;
      }

      setState(
        produce((draft) => {
          if (draft[name] === undefined) {
            draft[name] = {};
          }

          if (draft[name].default === undefined) {
            draft[name].default = {};
          }

          draft[name].default = values;
        })
      );
    },
    [isReadOnly]
  );

  const handleSubmit = React.useCallback(() => {
    if (isReadOnly === true) {
      onClose?.();
      return;
    }

    const conditionsWithoutCategory = Object.entries(state).reduce<Record<string, ConditionForm>>(
      (acc, current) => {
        const [key, value] = current;

        const merged = Object.values(value).reduce((acc1, current1) => {
          return { ...acc1, ...current1 };
        }, {});

        acc[key] = merged;

        return acc;
      },
      {}
    );

    onChangeConditions(conditionsWithoutCategory);
    onClose?.();
  }, [isReadOnly, state, onChangeConditions, onClose]);

  const onCloseModal = React.useCallback(() => {
    setState(
      createDefaultConditionsForm(actionsToDisplay, modifiedData, arrayOfOptionsGroupedByCategory)
    );

    onClose?.();
  }, [actionsToDisplay, modifiedData, arrayOfOptionsGroupedByCategory, onClose]);

  return (
    <Modal.Content>
      <Modal.Header>
        <Breadcrumbs id="condition-modal-breadcrumbs" label={headerBreadCrumbs.join(', ')}>
          {headerBreadCrumbs.map((label, index, arr) => (
            <Crumb isCurrent={index === arr.length - 1} key={label}>
              {upperFirst(
                formatMessage({
                  id: label,
                  defaultMessage: label,
                })
              )}
            </Crumb>
          ))}
        </Breadcrumbs>
      </Modal.Header>
      <Modal.Body>
        {isReadOnly && (
          <Box paddingBottom={4}>
            <Typography textColor="neutral600">
              {formatMessage({
                id: 'Settings.permissions.conditions.inherited-readonly',
                defaultMessage:
                  'These conditions are inherited from your permissions and are read-only.',
              })}
            </Typography>
          </Box>
        )}
        {actionsToDisplay.length === 0 && (
          <Typography>
            {formatMessage({
              id: 'Settings.permissions.conditions.no-actions',
              defaultMessage:
                'You first need to select actions (create, read, update, ...) before defining conditions on them.',
            })}
          </Typography>
        )}
        <ul>
          {actionsToDisplay.map(({ actionId, label, pathToConditionsObject }, index) => {
            const name = pathToConditionsObject.join('..');
            // Content types: [kind, subject, actionId]. Plugins & settings: subject is null.
            const [root, subject] = pathToConditionsObject;
            const isContentType = root === 'collectionTypes' || root === 'singleTypes';

            return (
              <ActionRow
                key={actionId}
                allowedConditions={getAllowedConditions(actionId, isContentType ? subject : null)}
                arrayOfOptionsGroupedByCategory={arrayOfOptionsGroupedByCategory}
                label={label}
                isFormDisabled={isFormDisabled || isReadOnly}
                isReadOnly={isReadOnly}
                isGrey={index % 2 === 0}
                name={name}
                onChange={handleChange}
                value={get(state, name, {})}
              />
            );
          })}
        </ul>
      </Modal.Body>
      <Modal.Footer>
        {isReadOnly ? (
          <Button variant="tertiary" onClick={() => onCloseModal()}>
            {formatMessage({ id: 'app.components.Button.close', defaultMessage: 'Close' })}
          </Button>
        ) : (
          <>
            <Button variant="tertiary" onClick={() => onCloseModal()}>
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button onClick={handleSubmit}>
              {formatMessage({
                id: 'Settings.permissions.conditions.apply',
                defaultMessage: 'Apply',
              })}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal.Content>
  );
};

const createDefaultConditionsForm = (
  actionsToDisplay: Array<ConditionAction | VisibleCheckboxAction>,
  modifiedData: PermissionsDataManagerContextValue['modifiedData'],
  arrayOfOptionsGroupedByCategory: ActionRowProps['arrayOfOptionsGroupedByCategory']
) => {
  return actionsToDisplay.reduce<Record<string, Record<string, ConditionForm>>>((acc, current) => {
    const valueFromModifiedData: ConditionForm = get(
      modifiedData,
      [...current.pathToConditionsObject, 'conditions'],
      {}
    );

    const categoryDefaultForm = arrayOfOptionsGroupedByCategory.reduce<
      Record<string, ConditionForm>
    >((acc, current) => {
      const [categoryName, relatedConditions] = current;

      const conditionsForm = relatedConditions.reduce<ConditionForm>((acc, current) => {
        acc[current.id] = get(valueFromModifiedData, current.id, false);

        return acc;
      }, {});

      acc[categoryName] = conditionsForm;

      return acc;
    }, {});

    acc[current.pathToConditionsObject.join('..')] = categoryDefaultForm;

    return acc;
  }, {});
};

/* -------------------------------------------------------------------------------------------------
 * ActionRow
 * -----------------------------------------------------------------------------------------------*/

interface ActionRowProps {
  /**
   * The conditions the user may select, `undefined` when unrestricted. Other conditions are
   * disabled (kept as they are if already set), and the last allowed one cannot be removed.
   */
  allowedConditions?: string[];
  arrayOfOptionsGroupedByCategory: Array<
    [string, PermissionsDataManagerContextValue['availableConditions']]
  >;
  isFormDisabled?: boolean;
  isGrey?: boolean;
  isReadOnly?: boolean;
  label: string;
  name: string;
  onChange?: (name: string, values: Record<string, boolean>) => void;
  value: Record<string, ConditionForm>;
}

const ActionRow = ({
  allowedConditions,
  arrayOfOptionsGroupedByCategory,
  isFormDisabled = false,
  isGrey = false,
  isReadOnly = false,
  label,
  name,
  onChange,
  value,
}: ActionRowProps) => {
  const { formatMessage } = useIntl();

  const selectedValues = getSelectedValues(value);
  const selectedAllowedValues =
    allowedConditions === undefined
      ? []
      : selectedValues.filter((conditionId) => allowedConditions.includes(conditionId));

  // A permission carrying a condition the user cannot set is outside their ceiling: any change
  // to it would be rejected (adding a condition broadens it), so the whole row is locked.
  const isLocked =
    allowedConditions !== undefined &&
    selectedValues.some((conditionId) => !allowedConditions.includes(conditionId));

  const isOptionDisabled = (conditionId: string) => {
    if (allowedConditions === undefined) {
      return false;
    }

    // The server rejects a condition-restricted permission without any of the user's conditions
    const isLastAllowedSelected =
      selectedAllowedValues.length === 1 && selectedAllowedValues[0] === conditionId;

    return isLocked || !allowedConditions.includes(conditionId) || isLastAllowedSelected;
  };

  const handleChange: MultiSelectProps['onChange'] = (val = []) => {
    if (isLocked) {
      return;
    }

    if (
      allowedConditions !== undefined &&
      selectedAllowedValues.length > 0 &&
      !val.some((conditionId) => allowedConditions.includes(conditionId))
    ) {
      return;
    }

    if (onChange) {
      onChange(name, getNewStateFromChangedValues(arrayOfOptionsGroupedByCategory, val));
    }
  };

  return (
    <Flex
      tag="li"
      background={isGrey ? 'neutral100' : 'neutral0'}
      paddingBottom={3}
      paddingTop={3}
      justifyContent={'space-evenly'}
    >
      <Flex style={{ width: 180 }}>
        <Typography variant="sigma" textColor="neutral600">
          {formatMessage({
            id: 'Settings.permissions.conditions.can',
            defaultMessage: 'Can',
          })}
          &nbsp;
        </Typography>
        <Typography variant="sigma" title={label} textColor="primary600" ellipsis>
          {formatMessage({
            id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
            defaultMessage: label,
          })}
        </Typography>
        <Typography variant="sigma" textColor="neutral600">
          &nbsp;
          {formatMessage({
            id: 'Settings.permissions.conditions.when',
            defaultMessage: 'When',
          })}
        </Typography>
      </Flex>
      <Box style={{ maxWidth: 430, width: '100%' }}>
        {isReadOnly ? (
          <Flex direction="column" alignItems="flex-start" gap={3}>
            {selectedValues.length === 0 ? (
              <Typography textColor="neutral600">
                {formatMessage({
                  id: 'Settings.permissions.conditions.none-applied',
                  defaultMessage: 'No conditions applied.',
                })}
              </Typography>
            ) : (
              arrayOfOptionsGroupedByCategory
                .map(([categoryName, conditions]) => {
                  const selectedConditions = conditions.filter((c) =>
                    selectedValues.includes(c.id)
                  );

                  if (selectedConditions.length === 0) {
                    return null;
                  }

                  return (
                    <Flex key={categoryName} direction="column" alignItems="flex-start" gap={2}>
                      <Typography variant="pi" fontWeight="bold" textColor="neutral600">
                        {categoryName}
                      </Typography>
                      <Box>
                        <Typography variant="omega" textColor="neutral800">
                          {selectedConditions.map((condition) => condition.displayName).join(', ')}
                        </Typography>
                      </Box>
                    </Flex>
                  );
                })
                .filter(Boolean)
            )}
          </Flex>
        ) : (
          <MultiSelect
            id={name}
            customizeContent={(values = []) => `${values.length} currently selected`}
            onChange={handleChange}
            value={selectedValues}
            disabled={isFormDisabled}
          >
            {arrayOfOptionsGroupedByCategory.map(([categoryName, conditions]) => {
              const enabledValues = conditions
                .map((condition) => condition.id)
                .filter((conditionId) => !isOptionDisabled(conditionId));

              return (
                <MultiSelectGroup
                  key={categoryName}
                  label={capitalise(categoryName)}
                  values={enabledValues}
                >
                  {conditions.map((condition) => (
                    <NestedOption
                      key={condition.id}
                      value={condition.id}
                      disabled={isOptionDisabled(condition.id)}
                    >
                      {condition.displayName}
                    </NestedOption>
                  ))}
                </MultiSelectGroup>
              );
            })}
          </MultiSelect>
        )}
      </Box>
    </Flex>
  );
};

const getSelectedValues = (rawValue: Record<string, ConditionForm>): string[] =>
  Object.values(rawValue)
    .map((x) =>
      Object.entries(x)
        .filter(([, value]) => value)
        .map(([key]) => key)
    )
    .flat();

// Matches the indentation MultiSelectNested gives its options, which doesn't support disabling one
const NestedOption = styled(MultiSelectOption)`
  padding-left: ${({ theme }) => theme.spaces[7]};
`;

const getNewStateFromChangedValues = (
  options: ActionRowProps['arrayOfOptionsGroupedByCategory'],
  changedValues: string[]
) =>
  options
    .map(([, values]) => values)
    .flat()
    .reduce<Record<string, boolean>>(
      (acc, curr) => ({ [curr.id]: changedValues.includes(curr.id), ...acc }),
      {}
    );

export { ConditionsModal };
export type { ConditionsModalProps };
