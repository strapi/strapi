import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Modal,
  MultiSelectNested,
  MultiSelectNestedProps,
  Typography,
  Breadcrumbs,
  Crumb,
} from '@strapi/design-system';
import { produce } from 'immer';
import get from 'lodash/get';
import groupBy from 'lodash/groupBy';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';

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
  onClose?: () => void;
}

const ConditionsModal = ({
  actions = [],
  headerBreadCrumbs = [],
  isFormDisabled,
  onClose,
}: ConditionsModalProps) => {
  const { formatMessage } = useIntl();
  const { availableConditions, modifiedData, onChangeConditions } = usePermissionsDataManager();

  const arrayOfOptionsGroupedByCategory = React.useMemo(() => {
    return Object.entries(groupBy(availableConditions, 'category'));
  }, [availableConditions]);

  const actionsToDisplay = actions.filter<VisibleCheckboxAction | ConditionAction>(
    // @ts-expect-error – TODO: fix this type issue
    ({ isDisplayed, hasSomeActionsSelected, hasAllActionsSelected }) =>
      isDisplayed && Boolean(hasSomeActionsSelected || hasAllActionsSelected)
  );

  const [state, setState] = React.useState(
    createDefaultConditionsForm(actionsToDisplay, modifiedData, arrayOfOptionsGroupedByCategory)
  );

  const handleChange = (name: string, values: ConditionForm) => {
    setState(
      produce((draft) => {
        if (!draft[name]) {
          draft[name] = {};
        }

        if (!draft[name].default) {
          draft[name].default = {};
        }

        draft[name].default = values;
      })
    );
  };

  const handleSubmit = () => {
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
    onClose && onClose();
  };

  const onCloseModal = () => {
    setState(
      createDefaultConditionsForm(actionsToDisplay, modifiedData, arrayOfOptionsGroupedByCategory)
    );

    onClose && onClose();
  };

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

            return (
              <ActionRow
                key={actionId}
                arrayOfOptionsGroupedByCategory={arrayOfOptionsGroupedByCategory}
                label={label}
                isFormDisabled={isFormDisabled}
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
        <Button variant="tertiary" onClick={() => onCloseModal()}>
          {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button onClick={handleSubmit}>
          {formatMessage({
            id: 'Settings.permissions.conditions.apply',
            defaultMessage: 'Apply',
          })}
        </Button>
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
  arrayOfOptionsGroupedByCategory: Array<
    [string, PermissionsDataManagerContextValue['availableConditions']]
  >;
  isFormDisabled?: boolean;
  isGrey?: boolean;
  label: string;
  name: string;
  onChange?: (name: string, values: Record<string, boolean>) => void;
  value: Record<string, ConditionForm>;
}

const ActionRow = ({
  arrayOfOptionsGroupedByCategory,
  isFormDisabled = false,
  isGrey = false,
  label,
  name,
  onChange,
  value,
}: ActionRowProps) => {
  const { formatMessage } = useIntl();

  const handleChange: MultiSelectNestedProps['onChange'] = (val) => {
    if (onChange) {
      onChange(name, getNewStateFromChangedValues(arrayOfOptionsGroupedByCategory, val));
    }
  };

  return (
    <Flex tag="li" background={isGrey ? 'neutral100' : 'neutral0'} paddingBottom={3} paddingTop={3}>
      <Flex paddingLeft={6} style={{ width: 180 }}>
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
        <MultiSelectNested
          id={name}
          customizeContent={(values = []) => `${values.length} currently selected`}
          onChange={handleChange}
          value={getSelectedValues(value)}
          options={getNestedOptions(arrayOfOptionsGroupedByCategory)}
          disabled={isFormDisabled}
        />
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

const getNestedOptions = (options: ActionRowProps['arrayOfOptionsGroupedByCategory']) =>
  options.reduce<MultiSelectNestedProps['options']>((acc, [label, children]) => {
    acc.push({
      label: capitalise(label),
      children: children.map((child) => ({
        label: child.displayName,
        value: child.id,
      })),
    });

    return acc;
  }, []);

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
