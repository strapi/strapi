import * as React from 'react';

import { Checkbox, Box, BoxComponent, Flex, FlexComponent, Modal } from '@strapi/design-system';
import { ChevronDown, ChevronUp } from '@strapi/icons';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import { useIntl } from 'react-intl';
import { styled, DefaultTheme } from 'styled-components';

import { Action, Subject } from '../../../../../../../shared/contracts/permissions';
import { capitalise } from '../../../../../utils/strings';
import {
  PermissionsDataManagerContextValue,
  usePermissionsDataManager,
} from '../hooks/usePermissionsDataManager';
import { cellWidth, rowHeight } from '../utils/constants';
import { createArrayOfValues } from '../utils/createArrayOfValues';
import { ConditionForm } from '../utils/forms';
import { getCheckboxState } from '../utils/getCheckboxState';

import { CollapsePropertyMatrix } from './CollapsePropertyMatrix';
import { ConditionsButton } from './ConditionsButton';
import { ConditionsModal } from './ConditionsModal';
import { HiddenAction } from './HiddenAction';
import { RowLabelWithCheckbox, RowLabelWithCheckboxProps } from './RowLabelWithCheckbox';

/* -------------------------------------------------------------------------------------------------
 * ContentTypeCollapses
 * -----------------------------------------------------------------------------------------------*/

interface ContentTypeCollapsesProps extends Pick<CollapseProps, 'pathToData'> {
  actions?: Action[];
  isFormDisabled?: boolean;
  subjects?: Subject[];
}

const ContentTypeCollapses = ({
  actions = [],
  isFormDisabled,
  pathToData,
  subjects = [],
}: ContentTypeCollapsesProps) => {
  const [collapseToOpen, setCollapseToOpen] = React.useState<string | null>(null);

  const handleClickToggleCollapse = (collapseName: string) => () => {
    const nextCollapseToOpen = collapseToOpen === collapseName ? null : collapseName;

    setCollapseToOpen(nextCollapseToOpen);
  };

  return (
    <>
      {subjects.map(({ uid, label, properties }, index) => {
        const isActive = collapseToOpen === uid;
        const availableActions = actions.map((action) => ({
          ...action,
          isDisplayed: Array.isArray(action.subjects) && action.subjects.indexOf(uid) !== -1,
        }));
        return (
          <Flex
            key={uid}
            direction="column"
            display="inline-flex"
            alignItems="stretch"
            minWidth="100%"
            borderColor={isActive ? 'primary600' : undefined}
          >
            <Collapse
              availableActions={availableActions}
              isActive={isActive}
              isGrey={index % 2 === 0}
              isFormDisabled={isFormDisabled}
              label={label}
              onClickToggle={handleClickToggleCollapse(uid)}
              pathToData={[pathToData, uid].join('..')}
            />
            {isActive &&
              properties.map(({ label: propertyLabel, value, children: childrenForm }) => {
                return (
                  <CollapsePropertyMatrix
                    availableActions={availableActions}
                    childrenForm={childrenForm}
                    isFormDisabled={isFormDisabled}
                    label={propertyLabel}
                    pathToData={[pathToData, uid].join('..')}
                    propertyName={value}
                    key={value}
                  />
                );
              })}
          </Flex>
        );
      })}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Collapse
 * -----------------------------------------------------------------------------------------------*/

interface CollapseProps
  extends Pick<RowLabelWithCheckboxProps, 'isActive' | 'isFormDisabled' | 'label'> {
  availableActions?: Array<Action & { isDisplayed: boolean }>;
  isGrey?: boolean;
  onClickToggle: RowLabelWithCheckboxProps['onClick'];
  pathToData: string;
}

const Collapse = ({
  availableActions = [],
  isActive = false,
  isGrey = false,
  isFormDisabled = false,
  label,
  onClickToggle,
  pathToData,
}: CollapseProps) => {
  const { formatMessage } = useIntl();
  const { modifiedData, onChangeParentCheckbox, onChangeSimpleCheckbox } =
    usePermissionsDataManager();
  const [isConditionModalOpen, setIsConditionModalOpen] = React.useState(false);

  // This corresponds to the data related to the CT left checkbox
  // modifiedData: { collectionTypes: { [ctuid]: {create: {properties: { fields: {f1: true} }, update: {}, ... } } } }
  const mainData = get(modifiedData, pathToData.split('..'), {});
  // The utils we are using: getCheckboxState, retrieves all the boolean leafs of an object in order
  // to return the state of checkbox. Since the conditions are not related to the property we need to remove the key from the object.
  const dataWithoutCondition = React.useMemo(() => {
    return Object.keys(mainData).reduce<Record<string, ConditionForm>>((acc, current) => {
      acc[current] = omit(mainData[current], 'conditions');

      return acc;
    }, {});
  }, [mainData]);

  const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(dataWithoutCondition);

  // Here we create an array of <checkbox>, since the state of each one of them is used in
  // order to know if whether or not we need to display the associated action in
  // the <ConditionsModal />
  const checkboxesActions = React.useMemo(() => {
    return generateCheckboxesActions(availableActions, modifiedData, pathToData);
  }, [availableActions, modifiedData, pathToData]);

  // @ts-expect-error – hasConditions does not exist on all versions of checkboxesActions.
  const doesConditionButtonHasConditions = checkboxesActions.some((action) => action.hasConditions);

  return (
    <BoxWrapper $isActive={isActive}>
      <Wrapper
        height={rowHeight}
        flex={1}
        alignItems="center"
        background={isGrey ? 'neutral100' : 'neutral0'}
      >
        <RowLabelWithCheckbox
          isCollapsable
          isFormDisabled={isFormDisabled}
          label={capitalise(label)}
          checkboxName={pathToData}
          onChange={onChangeParentCheckbox}
          onClick={onClickToggle}
          someChecked={hasSomeActionsSelected}
          value={hasAllActionsSelected}
          isActive={isActive}
        >
          <Chevron paddingLeft={2}>{isActive ? <ChevronUp /> : <ChevronDown />}</Chevron>
        </RowLabelWithCheckbox>

        <Flex style={{ flex: 1 }}>
          {checkboxesActions.map(
            ({ actionId, hasSomeActionsSelected, isDisplayed, ...restAction }) => {
              if (!isDisplayed) {
                return <HiddenAction key={actionId} />;
              }

              const {
                hasConditions,
                hasAllActionsSelected,
                isParentCheckbox,
                checkboxName,
                label: permissionLabel,
              } = restAction as VisibleCheckboxAction;

              if (isParentCheckbox) {
                return (
                  <Cell key={actionId} justifyContent="center" alignItems="center">
                    {hasConditions && (
                      <Box
                        tag="span"
                        position="absolute"
                        top="-6px"
                        left="37px"
                        width="6px"
                        height="6px"
                        borderRadius="20px"
                        background="primary600"
                      />
                    )}
                    <Checkbox
                      disabled={isFormDisabled}
                      name={checkboxName}
                      aria-label={formatMessage(
                        {
                          id: `Settings.permissions.select-by-permission`,
                          defaultMessage: 'Select {label} permission',
                        },
                        { label: `${permissionLabel} ${label}` }
                      )}
                      // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                      onCheckedChange={(value) => {
                        onChangeParentCheckbox({
                          target: {
                            name: checkboxName,
                            value: !!value,
                          },
                        });
                      }}
                      checked={hasSomeActionsSelected ? 'indeterminate' : hasAllActionsSelected}
                    />
                  </Cell>
                );
              }

              return (
                <Cell key={actionId} justifyContent="center" alignItems="center">
                  {hasConditions && (
                    <Box
                      tag="span"
                      position="absolute"
                      top="-6px"
                      left="37px"
                      width="6px"
                      height="6px"
                      borderRadius="20px"
                      background="primary600"
                    />
                  )}
                  <Checkbox
                    disabled={isFormDisabled}
                    name={checkboxName}
                    // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                    onCheckedChange={(value) => {
                      onChangeSimpleCheckbox({
                        target: {
                          name: checkboxName,
                          value: !!value,
                        },
                      });
                    }}
                    checked={hasConditions ? 'indeterminate' : hasAllActionsSelected}
                  />
                </Cell>
              );
            }
          )}
        </Flex>
      </Wrapper>
      <Box bottom="10px" right="9px" position="absolute">
        <Modal.Root
          open={isConditionModalOpen}
          onOpenChange={() => {
            setIsConditionModalOpen((prev) => !prev);
          }}
        >
          <Modal.Trigger>
            <ConditionsButton hasConditions={doesConditionButtonHasConditions} />
          </Modal.Trigger>
          <ConditionsModal
            headerBreadCrumbs={[label, 'Settings.permissions.conditions.conditions']}
            actions={checkboxesActions}
            isFormDisabled={isFormDisabled}
            onClose={() => {
              setIsConditionModalOpen(false);
            }}
          />
        </Modal.Root>
      </Box>
    </BoxWrapper>
  );
};

interface VisibleCheckboxAction {
  actionId: string;
  hasAllActionsSelected: boolean;
  hasSomeActionsSelected: boolean;
  isDisplayed: true;
  isParentCheckbox: boolean;
  checkboxName: string;
  label: string;
  hasConditions: boolean;
  pathToConditionsObject: string[];
}

interface HiddenCheckboxAction {
  actionId: string;
  isDisplayed: false;
  hasAllActionsSelected?: never;
  hasSomeActionsSelected: boolean;
}

const generateCheckboxesActions = (
  availableActions: Array<Action & { isDisplayed: boolean }>,
  modifiedData: PermissionsDataManagerContextValue['modifiedData'],
  pathToData: string
): Array<VisibleCheckboxAction | HiddenCheckboxAction> => {
  return availableActions.map(({ actionId, isDisplayed, applyToProperties, label }) => {
    if (!isDisplayed) {
      return { actionId, hasSomeActionsSelected: false, isDisplayed };
    }

    const baseCheckboxNameArray = [...pathToData.split('..'), actionId];
    const checkboxNameArray = isEmpty(applyToProperties)
      ? [...baseCheckboxNameArray, 'properties', 'enabled']
      : baseCheckboxNameArray;
    const conditionsValue = get(modifiedData, [...baseCheckboxNameArray, 'conditions'], null);

    const baseCheckboxAction = {
      actionId,
      checkboxName: checkboxNameArray.join('..'),
      hasConditions: createArrayOfValues(conditionsValue).some((val) => val),
      isDisplayed,
      label,
      pathToConditionsObject: baseCheckboxNameArray,
    };

    if (isEmpty(applyToProperties)) {
      const value = get(modifiedData, checkboxNameArray, false);

      // Since applyToProperties is empty it is not a parent checkbox, therefore hasAllActionsSelected is
      // equal to hasSomeActionsSelected
      return {
        ...baseCheckboxAction,
        hasAllActionsSelected: value,
        hasSomeActionsSelected: value,
        isParentCheckbox: false,
      };
    }

    const mainData = get(modifiedData, checkboxNameArray, null);

    const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(mainData);

    return {
      ...baseCheckboxAction,
      hasAllActionsSelected,
      hasSomeActionsSelected,
      isParentCheckbox: true,
    };
  });
};

const activeRowStyle = (theme: DefaultTheme, isActive?: boolean): string => `
  ${Wrapper} {
    background-color: ${theme.colors.primary100};
    color: ${theme.colors.primary600};
    border-radius: ${isActive ? '2px 2px 0 0' : '2px'};
    font-weight: ${theme.fontWeights.bold};
  }

  ${Chevron} {
    display: flex;
  }
  ${ConditionsButton} {
    display: block;
  }

  &:focus-within {
    ${() => activeRowStyle(theme, isActive)}
  }
`;

const Wrapper = styled<FlexComponent>(Flex)`
  border: 1px solid transparent;
`;

const BoxWrapper = styled.div<{ $isActive: boolean }>`
  display: inline-flex;
  min-width: 100%;
  position: relative;

  ${ConditionsButton} {
    display: none;
  }

  ${({ $isActive, theme }) => $isActive && activeRowStyle(theme, $isActive)}

  &:hover {
    ${({ theme, $isActive }) => activeRowStyle(theme, $isActive)}
  }
`;

const Cell = styled<FlexComponent>(Flex)`
  width: ${cellWidth};
  position: relative;
`;

const Chevron = styled<BoxComponent>(Box)`
  display: none;

  svg {
    width: 1.4rem;
  }

  path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

export { ContentTypeCollapses };
export type { ContentTypeCollapsesProps, HiddenCheckboxAction, VisibleCheckboxAction };
