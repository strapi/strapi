import * as React from 'react';

import {
  Accordion,
  Box,
  BoxComponent,
  Checkbox,
  Flex,
  Grid,
  Modal,
  Typography,
} from '@strapi/design-system';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import {
  SettingPermission,
  PluginPermission,
} from '../../../../../../../shared/contracts/permissions';
import { capitalise } from '../../../../../utils/strings';
import {
  PermissionsDataManagerContextValue,
  usePermissionsDataManager,
} from '../hooks/usePermissionsDataManager';
import { createArrayOfValues } from '../utils/createArrayOfValues';
import { ChildrenForm, ConditionForm } from '../utils/forms';
import { RecursiveRecordOfBooleans, getCheckboxState } from '../utils/getCheckboxState';
import { removeConditionKeyFromData } from '../utils/removeConditionKeyFromData';

import { ConditionsButton } from './ConditionsButton';
import { ConditionsModal } from './ConditionsModal';

import type { GenericLayout } from '../utils/layouts';

/* -------------------------------------------------------------------------------------------------
 * PluginsAndSettingsPermissions
 * -----------------------------------------------------------------------------------------------*/

type Layout = GenericLayout<SettingPermission | PluginPermission>[];

interface PluginsAndSettingsPermissionsProps extends Pick<RowProps, 'kind' | 'isFormDisabled'> {
  layout: Layout;
}

const PluginsAndSettingsPermissions = ({
  layout,
  ...restProps
}: PluginsAndSettingsPermissionsProps) => {
  return (
    <Box padding={6} background="neutral0">
      <Accordion.Root size="M">
        {layout.map(({ category, categoryId, childrenForm }, index) => {
          return (
            <Row
              key={category}
              childrenForm={childrenForm}
              variant={index % 2 === 1 ? 'primary' : 'secondary'}
              name={category}
              pathToData={[restProps.kind, categoryId]}
              {...restProps}
            />
          );
        })}
      </Accordion.Root>
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Row
 * -----------------------------------------------------------------------------------------------*/

interface RowProps
  extends Pick<Layout[number], 'childrenForm'>,
    Pick<Accordion.HeaderProps, 'variant'> {
  kind: Exclude<keyof PermissionsDataManagerContextValue['modifiedData'], `${string}Types`>;
  name: string;
  isFormDisabled?: boolean;
  pathToData: string[];
}

const Row = ({
  childrenForm,
  kind,
  name,
  isFormDisabled = false,
  variant,
  pathToData,
}: RowProps) => {
  const { formatMessage } = useIntl();

  const categoryName = name.split('::').pop() ?? '';

  return (
    <Accordion.Item value={name}>
      <Accordion.Header variant={variant}>
        <Accordion.Trigger
          caretPosition="right"
          description={`${formatMessage(
            { id: 'Settings.permissions.category', defaultMessage: categoryName },
            { category: categoryName }
          )} ${kind === 'plugins' ? 'plugin' : kind}`}
        >
          {capitalise(categoryName)}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content>
        <Box padding={6}>
          {childrenForm.map(({ actions, subCategoryName, subCategoryId }) => (
            <SubCategory
              key={subCategoryName}
              actions={actions}
              categoryName={categoryName}
              isFormDisabled={isFormDisabled}
              subCategoryName={subCategoryName}
              pathToData={[...pathToData, subCategoryId]}
            />
          ))}
        </Box>
      </Accordion.Content>
    </Accordion.Item>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SubCategory
 * -----------------------------------------------------------------------------------------------*/

interface SubCategoryProps {
  actions?: Array<SettingPermission | PluginPermission>;
  categoryName: string;
  isFormDisabled?: boolean;
  subCategoryName: string;
  pathToData: string[];
}

const SubCategory = ({
  actions = [],
  categoryName,
  isFormDisabled,
  subCategoryName,
  pathToData,
}: SubCategoryProps) => {
  const { modifiedData, onChangeParentCheckbox, onChangeSimpleCheckbox } =
    usePermissionsDataManager();
  const [isConditionModalOpen, setIsConditionModalOpen] = React.useState(false);
  const { formatMessage } = useIntl();

  const mainData = get(modifiedData, pathToData, {});

  const dataWithoutCondition = React.useMemo(() => {
    return Object.keys(mainData).reduce<RecursiveRecordOfBooleans>((acc, current) => {
      acc[current] = removeConditionKeyFromData(mainData[current])!;

      return acc;
    }, {});
  }, [mainData]);

  const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(dataWithoutCondition);

  // We need to format the actions so it matches the shape of the ConditionsModal actions props
  const formattedActions = React.useMemo(() => {
    return actions.map((action) => {
      const checkboxName = [...pathToData, action.action, 'properties', 'enabled'];
      const checkboxValue = get(modifiedData, checkboxName, false);
      const conditionValue = get(modifiedData, [...pathToData, action.action, 'conditions'], {});
      const hasConditions = createArrayOfValues(conditionValue).some((val) => val);

      return {
        ...action,
        isDisplayed: checkboxValue,
        checkboxName: checkboxName.join('..'),
        hasSomeActionsSelected: checkboxValue,
        value: checkboxValue,
        hasConditions,
        label: action.displayName,
        actionId: action.action,
        pathToConditionsObject: [...pathToData, action.action],
      };
    });
  }, [actions, modifiedData, pathToData]);

  const datum: ChildrenForm = get(modifiedData, [...pathToData], {});

  const doesButtonHasCondition = createArrayOfValues(
    Object.entries(datum).reduce<Record<string, ConditionForm>>((acc, current) => {
      const [catName, { conditions }] = current;

      acc[catName] = conditions;

      return acc;
    }, {})
  ).some((val) => val);

  return (
    <>
      <Box>
        <Flex justifyContent="space-between" alignItems="center">
          <Box paddingRight={4}>
            <Typography variant="sigma" textColor="neutral600">
              {subCategoryName}
            </Typography>
          </Box>
          <Border flex={1} />
          <Box paddingLeft={4}>
            <Checkbox
              name={pathToData.join('..')}
              disabled={isFormDisabled}
              // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
              onCheckedChange={(value) => {
                onChangeParentCheckbox({
                  target: {
                    name: pathToData.join('..'),
                    value: !!value,
                  },
                });
              }}
              checked={hasSomeActionsSelected ? 'indeterminate' : hasAllActionsSelected}
            >
              {formatMessage({ id: 'app.utils.select-all', defaultMessage: 'Select all' })}
            </Checkbox>
          </Box>
        </Flex>
        <Flex paddingTop={6} paddingBottom={6}>
          <Grid.Root gap={2} style={{ flex: 1 }}>
            {formattedActions.map(({ checkboxName, value, action, displayName, hasConditions }) => {
              return (
                <Grid.Item col={3} key={action} direction="column" alignItems="start">
                  <CheckboxWrapper $disabled={isFormDisabled} $hasConditions={hasConditions}>
                    <Checkbox
                      name={checkboxName}
                      disabled={isFormDisabled}
                      // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                      onCheckedChange={(value) => {
                        onChangeSimpleCheckbox({
                          target: {
                            name: checkboxName,
                            value: !!value,
                          },
                        });
                      }}
                      checked={value}
                    >
                      {displayName}
                    </Checkbox>
                  </CheckboxWrapper>
                </Grid.Item>
              );
            })}
          </Grid.Root>
          <Modal.Root
            open={isConditionModalOpen}
            onOpenChange={() => {
              setIsConditionModalOpen((prev) => !prev);
            }}
          >
            <Modal.Trigger>
              <ConditionsButton hasConditions={doesButtonHasCondition} />
            </Modal.Trigger>
            <ConditionsModal
              headerBreadCrumbs={[categoryName, subCategoryName]}
              actions={formattedActions}
              isFormDisabled={isFormDisabled}
              onClose={() => {
                setIsConditionModalOpen(false);
              }}
            />
          </Modal.Root>
        </Flex>
      </Box>
    </>
  );
};

const Border = styled<BoxComponent>(Box)`
  align-self: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const CheckboxWrapper = styled.div<{ $hasConditions?: boolean; $disabled?: boolean }>`
  position: relative;
  word-break: keep-all;
  ${({ $hasConditions, $disabled, theme }) =>
    $hasConditions &&
    `
    &:before {
      content: '';
      position: absolute;
      top: -0.4rem;
      left: -0.8rem;
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 2rem;
      background: ${$disabled ? theme.colors.neutral100 : theme.colors.primary600};
    }
  `}
`;

export { PluginsAndSettingsPermissions };
