import React, { useCallback, useMemo } from 'react';

import { Box, Checkbox, Flex, Typography, Grid, VisuallyHidden } from '@strapi/design-system';
import { Cog } from '@strapi/icons';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useUsersPermissions } from '../../../contexts/UsersPermissionsContext';

import CheckboxWrapper from './CheckboxWrapper';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const SubCategory = ({ subCategory }) => {
  const { formatMessage } = useIntl();
  const { onChange, onChangeSelectAll, onSelectedAction, selectedAction, modifiedData } =
    useUsersPermissions();

  const currentScopedModifiedData = useMemo(() => {
    return get(modifiedData, subCategory.name, {});
  }, [modifiedData, subCategory]);

  const hasAllActionsSelected = useMemo(() => {
    return Object.values(currentScopedModifiedData).every((action) => action.enabled === true);
  }, [currentScopedModifiedData]);

  const hasSomeActionsSelected = useMemo(() => {
    return (
      Object.values(currentScopedModifiedData).some((action) => action.enabled === true) &&
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
    (actionName) => {
      return selectedAction === actionName;
    },
    [selectedAction]
  );

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center">
        <Box paddingRight={4}>
          <Typography variant="sigma" textColor="neutral600">
            {subCategory.label}
          </Typography>
        </Box>
        <Border />
        <Box paddingLeft={4}>
          <Checkbox
            name={subCategory.name}
            checked={hasSomeActionsSelected ? 'indeterminate' : hasAllActionsSelected}
            onCheckedChange={(value) =>
              handleChangeSelectAll({ target: { name: subCategory.name, value } })
            }
          >
            {formatMessage({ id: 'app.utils.select-all', defaultMessage: 'Select all' })}
          </Checkbox>
        </Box>
      </Flex>
      <Flex paddingTop={6} paddingBottom={6}>
        <Grid.Root gap={2} style={{ flex: 1 }}>
          {subCategory.actions.map((action) => {
            const name = `${action.name}.enabled`;

            return (
              <Grid.Item col={6} key={action.name} direction="column" alignItems="stretch">
                <CheckboxWrapper isActive={isActionSelected(action.name)} padding={2} hasRadius>
                  <Checkbox
                    checked={get(modifiedData, name, false)}
                    name={name}
                    onCheckedChange={(value) => onChange({ target: { name, value } })}
                  >
                    {action.label}
                  </Checkbox>
                  <button
                    type="button"
                    onClick={() => onSelectedAction(action.name)}
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                  >
                    <VisuallyHidden tag="span">
                      {formatMessage(
                        {
                          id: 'app.utils.show-bound-route',
                          defaultMessage: 'Show bound route for {route}',
                        },
                        {
                          route: action.name,
                        }
                      )}
                    </VisuallyHidden>
                    <Cog id="cog" cursor="pointer" />
                  </button>
                </CheckboxWrapper>
              </Grid.Item>
            );
          })}
        </Grid.Root>
      </Flex>
    </Box>
  );
};

SubCategory.propTypes = {
  subCategory: PropTypes.object.isRequired,
};

export default SubCategory;
