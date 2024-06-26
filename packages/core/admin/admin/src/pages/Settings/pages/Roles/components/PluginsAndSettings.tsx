import * as React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionToggle,
  Box,
  Checkbox,
  Flex,
  Grid,
  GridItem,
  Typography,
} from '@strapi/design-system';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

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
  const [openedCategory, setOpenedCategory] = React.useState<string | null>(null);

  const handleOpenCategory = (categoryName: string) => {
    setOpenedCategory(categoryName === openedCategory ? null : categoryName);
  };

  return (
    <Box padding={6} background="neutral0">
      {layout.map(({ category, categoryId, childrenForm }, index) => {
        return (
          <Row
            key={category}
            childrenForm={childrenForm}
            isOpen={openedCategory === category}
            isWhite={index % 2 === 1}
            name={category}
            onOpenCategory={handleOpenCategory}
            pathToData={[restProps.kind, categoryId]}
            {...restProps}
          />
        );
      })}
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Row
 * -----------------------------------------------------------------------------------------------*/

interface RowProps extends Pick<Layout[number], 'childrenForm'> {
  kind: Exclude<keyof PermissionsDataManagerContextValue['modifiedData'], `${string}Types`>;
  name: string;
  isFormDisabled?: boolean;
  isOpen?: boolean;
  isWhite?: boolean;
  onOpenCategory: (categoryName: string) => void;
  pathToData: string[];
}

const Row = ({
  childrenForm,
  kind,
  name,
  isOpen = false,
  isFormDisabled = false,
  isWhite,
  onOpenCategory,
  pathToData,
}: RowProps) => {
  const { formatMessage } = useIntl();
  const handleClick = () => {
    onOpenCategory(name);
  };

  const categoryName = name.split('::').pop() ?? '';

  return (
    <Accordion
      expanded={isOpen}
      onToggle={handleClick}
      id={`accordion-${name}`}
      variant={isWhite ? 'primary' : 'secondary'}
    >
      <AccordionToggle
        title={capitalise(categoryName)}
        description={`${formatMessage(
          { id: 'Settings.permissions.category', defaultMessage: categoryName },
          { category: categoryName }
        )} ${kind === 'plugins' ? 'plugin' : kind}`}
      />

      <AccordionContent>
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
      </AccordionContent>
    </Accordion>
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
  const [isModalOpen, setModalOpen] = React.useState(false);
  const { modifiedData, onChangeParentCheckbox, onChangeSimpleCheckbox } =
    usePermissionsDataManager();
  const { formatMessage } = useIntl();

  const mainData = get(modifiedData, pathToData, {});

  const dataWithoutCondition = React.useMemo(() => {
    return Object.keys(mainData).reduce<RecursiveRecordOfBooleans>((acc, current) => {
      acc[current] = removeConditionKeyFromData(mainData[current])!;

      return acc;
    }, {});
  }, [mainData]);

  const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(dataWithoutCondition);

  const handleToggleModalIsOpen = () => {
    setModalOpen((s) => !s);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };
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
              onValueChange={(value) => {
                onChangeParentCheckbox({
                  target: {
                    name: pathToData.join('..'),
                    value,
                  },
                });
              }}
              indeterminate={hasSomeActionsSelected}
              value={hasAllActionsSelected}
            >
              {formatMessage({ id: 'app.utils.select-all', defaultMessage: 'Select all' })}
            </Checkbox>
          </Box>
        </Flex>
        <Flex paddingTop={6} paddingBottom={6}>
          <Grid gap={2} style={{ flex: 1 }}>
            {formattedActions.map(({ checkboxName, value, action, displayName, hasConditions }) => {
              return (
                <GridItem col={3} key={action}>
                  <CheckboxWrapper disabled={isFormDisabled} hasConditions={hasConditions}>
                    <Checkbox
                      name={checkboxName}
                      disabled={isFormDisabled}
                      // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                      onValueChange={(value) => {
                        onChangeSimpleCheckbox({
                          target: {
                            name: checkboxName,
                            value,
                          },
                        });
                      }}
                      value={value}
                    >
                      {displayName}
                    </Checkbox>
                  </CheckboxWrapper>
                </GridItem>
              );
            })}
          </Grid>
          <ConditionsButton
            hasConditions={doesButtonHasCondition}
            onClick={handleToggleModalIsOpen}
          />
        </Flex>
      </Box>
      {isModalOpen && (
        <ConditionsModal
          headerBreadCrumbs={[categoryName, subCategoryName]}
          actions={formattedActions}
          isFormDisabled={isFormDisabled}
          onClosed={handleModalClose}
          onToggle={handleToggleModalIsOpen}
        />
      )}
    </>
  );
};

const Border = styled(Box)`
  align-self: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const CheckboxWrapper = styled.div<{ hasConditions?: boolean; disabled?: boolean }>`
  position: relative;
  word-break: keep-all;
  ${({ hasConditions, disabled, theme }) =>
    hasConditions &&
    `
    &:before {
      content: '';
      position: absolute;
      top: ${-4 / 16}rem;
      left: ${-8 / 16}rem;
      width: ${6 / 16}rem;
      height: ${6 / 16}rem;
      border-radius: ${20 / 16}rem;
      background: ${disabled ? theme.colors.neutral100 : theme.colors.primary600};
    }
  `}
`;

export { PluginsAndSettingsPermissions };
