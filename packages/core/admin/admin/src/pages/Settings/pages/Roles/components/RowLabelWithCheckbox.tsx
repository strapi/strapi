import * as React from 'react';

import { Checkbox, Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { PermissionsDataManagerContextValue } from '../hooks/usePermissionsDataManager';
import { firstRowWidth } from '../utils/constants';

import { CollapseLabel } from './CollapseLabel';

interface RowLabelWithCheckboxProps {
  children: React.ReactNode;
  checkboxName?: string;
  isActive?: boolean;
  isCollapsable?: boolean;
  isFormDisabled?: boolean;
  label: string;
  onChange: PermissionsDataManagerContextValue['onChangeParentCheckbox'];
  onClick: () => void;
  someChecked?: boolean;
  value: boolean;
}

const RowLabelWithCheckbox = ({
  checkboxName = '',
  children,
  isActive = false,
  isCollapsable = false,
  isFormDisabled = false,
  label,
  onChange,
  onClick,
  someChecked = false,
  value,
}: RowLabelWithCheckboxProps) => {
  const { formatMessage } = useIntl();

  const collapseLabelProps = {
    title: label,
    alignItems: 'center',
    $isCollapsable: isCollapsable,
  };

  if (isCollapsable) {
    Object.assign(collapseLabelProps, {
      onClick,
      'aria-expanded': isActive,
      onKeyDown({ key }: React.KeyboardEvent<HTMLDivElement>) {
        if (key === 'Enter' || key === ' ') {
          onClick();
        }
      },
      tabIndex: 0,
      role: 'button',
    });
  }

  return (
    <Flex alignItems="center" paddingLeft={6} width={firstRowWidth} shrink={0}>
      <Box paddingRight={2}>
        <Checkbox
          name={checkboxName}
          aria-label={formatMessage(
            {
              id: `Settings.permissions.select-all-by-permission`,
              defaultMessage: 'Select all {label} permissions',
            },
            { label }
          )}
          disabled={isFormDisabled}
          // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
          onCheckedChange={(value) =>
            onChange({
              target: {
                name: checkboxName,
                value: !!value,
              },
            })
          }
          checked={someChecked ? 'indeterminate' : value}
        />
      </Box>
      <CollapseLabel {...collapseLabelProps}>
        <Typography ellipsis>{label}</Typography>
        {children}
      </CollapseLabel>
    </Flex>
  );
};

export { RowLabelWithCheckbox };
export type { RowLabelWithCheckboxProps };
