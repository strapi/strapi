import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Grid, GridItem, Box, Checkbox, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import IS_DISABLED from 'ee_else_ce/pages/SettingsPage/pages/Roles/EditPage/components/PluginsAndSettings/SubCategory/utils/constants';
import { usePermissionsDataManager } from '../../../../../../../../hooks';
import { getCheckboxState, removeConditionKeyFromData } from '../../utils';
import ConditionsButton from '../../ConditionsButton';
import ConditionsModal from '../../ConditionsModal';
import { formatActions, getConditionsButtonState } from './utils';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const CheckboxWrapper = styled.div`
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

const SubCategory = ({ categoryName, isFormDisabled, subCategoryName, actions, pathToData }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const { modifiedData, onChangeParentCheckbox, onChangeSimpleCheckbox } =
    usePermissionsDataManager();
  const { formatMessage } = useIntl();

  const mainData = get(modifiedData, pathToData, {});
  const dataWithoutCondition = useMemo(() => {
    return Object.keys(mainData).reduce((acc, current) => {
      acc[current] = removeConditionKeyFromData(mainData[current]);

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
  const formattedActions = formatActions(actions, modifiedData, pathToData);
  const doesButtonHasCondition = getConditionsButtonState(get(modifiedData, [...pathToData], {}));

  return (
    <>
      <Box>
        <Flex justifyContent="space-between" alignItems="center">
          <Box paddingRight={4}>
            <Typography variant="sigma" textColor="neutral600">
              {subCategoryName}
            </Typography>
          </Box>
          <Border />
          <Box paddingLeft={4}>
            <Checkbox
              name={pathToData.join('..')}
              disabled={isFormDisabled || IS_DISABLED}
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
                  <CheckboxWrapper
                    disabled={isFormDisabled || IS_DISABLED}
                    hasConditions={hasConditions}
                  >
                    <Checkbox
                      name={checkboxName}
                      disabled={isFormDisabled || IS_DISABLED}
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

SubCategory.propTypes = {
  actions: PropTypes.array.isRequired,
  categoryName: PropTypes.string.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  subCategoryName: PropTypes.string.isRequired,
  pathToData: PropTypes.array.isRequired,
};

export default SubCategory;
