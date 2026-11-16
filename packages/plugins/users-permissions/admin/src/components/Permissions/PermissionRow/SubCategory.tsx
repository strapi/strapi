import React, { useCallback, useMemo } from 'react';

import { Box, Checkbox, Flex, Typography, Grid, VisuallyHidden } from '@strapi/design-system';
import { Cog } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useUsersPermissions } from '../../../contexts/UsersPermissionsContext/UsersPermissionsContext';

import { CheckboxWrapper } from './CheckboxWrapper';

import type { ControllerPermissions, PermissionAction } from '../../../types';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

export type SubCategoryData = {
  name: string;
  label: string;
  actions: (PermissionAction & { name: string; label: string })[];
};

/** Edits one controller's action permissions and bound-route selection. */
const SubCategory = ({ subCategory }: { subCategory: SubCategoryData }) => {
  const { formatMessage } = useIntl();
  const { onChange, onChangeSelectAll, onSelectedAction, selectedAction, modifiedData } =
    useUsersPermissions();

  const currentScopedModifiedData = useMemo<ControllerPermissions>(() => {
    const [plugin, , controller] = subCategory.name.split('.');
    return modifiedData[plugin]?.controllers[controller] ?? {};
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
    ({ target: { name } }: { target: { name: string } }) => {
      onChangeSelectAll({ target: { name, value: !hasAllActionsSelected } });
    },
    [hasAllActionsSelected, onChangeSelectAll]
  );

  const isActionSelected = useCallback(
    (actionName: string) => {
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
            onCheckedChange={() => handleChangeSelectAll({ target: { name: subCategory.name } })}
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
              <Grid.Item
                col={4}
                xs={12}
                s={6}
                key={action.name}
                direction="column"
                alignItems="stretch"
              >
                <CheckboxWrapper $isActive={isActionSelected(action.name)} padding={2} hasRadius>
                  <Checkbox
                    checked={currentScopedModifiedData[action.label]?.enabled ?? false}
                    name={name}
                    onCheckedChange={(value) =>
                      onChange({ target: { name, value: value === true } })
                    }
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

export { SubCategory };
