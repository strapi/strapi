import React, { useCallback, useMemo } from 'react';
import { get } from 'lodash';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { TableLabel, Box, Row, Checkbox, Grid, GridItem } from '@strapi/parts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useIntl } from 'react-intl';
import CheckboxWrapper from '../CheckboxWrapper';
import BaselineAlignment from '../BaselineAlignment';
import SubCategoryWrapper from './SubCategoryWrapper';
import { useUsersPermissions } from '../../../../contexts/UsersPermissionsContext';
import PolicyWrapper from './PolicyWrapper';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const SubCategory = ({ subCategory }) => {
  const { formatMessage } = useIntl();
  const {
    onChange,
    onChangeSelectAll,
    onSelectedAction,
    selectedAction,
    modifiedData,
  } = useUsersPermissions();

  const currentScopedModifiedData = useMemo(() => {
    return get(modifiedData, subCategory.name, {});
  }, [modifiedData, subCategory]);

  const hasAllActionsSelected = useMemo(() => {
    return Object.values(currentScopedModifiedData).every(action => action.enabled === true);
  }, [currentScopedModifiedData]);

  const hasSomeActionsSelected = useMemo(() => {
    return (
      Object.values(currentScopedModifiedData).some(action => action.enabled === true) &&
      !hasAllActionsSelected
    );
  }, [currentScopedModifiedData, hasAllActionsSelected]);

  const handleChangeSelectAll = useCallback(
    ({ target: { name } }) => {
      onChangeSelectAll({ target: { name, value: !hasAllActionsSelected } });
    },
    [hasAllActionsSelected, onChangeSelectAll]
  );

  const isActionSelected = useCallback(
    actionName => {
      return selectedAction === actionName;
    },
    [selectedAction]
  );

  return (
    <Box>
      <Row justifyContent="space-between" alignItems="center">
        <Box paddingRight={4}>
          <TableLabel textColor="neutral600">{subCategory.label}</TableLabel>
        </Box>
        <Border />
        <Box paddingLeft={4}>
          <Checkbox
            name={subCategory.name}
            value={hasAllActionsSelected}
            onValueChange={
              value => handleChangeSelectAll({target: { name: subCategory.name, value } })
            }
            indeterminate={hasSomeActionsSelected}
          >
            {formatMessage({ id: 'app.utils.select-all', defaultMessage: 'Select all' })}
          </Checkbox>
        </Box>
      </Row>
      <Row paddingTop={6} paddingBottom={6}>
        <Grid gap={2} style={{ flex: 1 }}>
          {subCategory.actions.map(action => {
            const name = `${action.name}.enabled`;

            return (
              <GridItem col={6} key={action.name}>
                <Checkbox
                  value={get(modifiedData, name, false)}
                  name={name}
                  onValueChange={value => onChange({ target: { name, value } })}
                >
                  {action.label}
                </Checkbox>
              </GridItem>
            );
          })}
        </Grid>
      </Row>
    </Box>
  );

  return (
    <SubCategoryWrapper>
      <Flex justifyContent="space-between" alignItems="center">
        <Padded right size="sm">
          <Text
            lineHeight="18px"
            color="#919bae"
            fontWeight="bold"
            fontSize="xs"
            textTransform="uppercase"
          >
            {subCategory.label}
          </Text>
        </Padded>
        <Border />
        <Padded left size="sm">
          <BaselineAlignment />
          <Checkbox
            name={subCategory.name}
            message={formatMessage({ id: 'app.utils.select-all' })}
            onChange={handleChangeSelectAll}
            someChecked={hasSomeActionsSelected}
            value={hasAllActionsSelected}
          />
        </Padded>
      </Flex>
      <BaselineAlignment />
      <Padded top size="xs">
        <Flex flexWrap="wrap">
          {subCategory.actions.map(action => {
            const name = `${action.name}.enabled`;

            return (
              <CheckboxWrapper isActive={isActionSelected(action.name)} key={action.name}>
                <Checkbox
                  value={get(modifiedData, name, false)}
                  name={name}
                  message={action.label}
                  onChange={onChange}
                />
                <PolicyWrapper onClick={() => onSelectedAction(action.name)}>
                  <FontAwesomeIcon icon="cog" />
                </PolicyWrapper>
              </CheckboxWrapper>
            );
          })}
        </Flex>
      </Padded>
    </SubCategoryWrapper>
  );
};

SubCategory.propTypes = {
  subCategory: PropTypes.object.isRequired,
};

export default SubCategory;
