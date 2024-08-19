import * as React from 'react';

import { BaseCheckbox, Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { capitalise } from '../../../../../utils/strings';
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

  return (
    <Flex alignItems="center" paddingLeft={6} width={firstRowWidth} shrink={0}>
      <Box paddingRight={2}>
        <BaseCheckbox
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
          onValueChange={(value) =>
            onChange({
              target: {
                name: checkboxName,
                value,
              },
            })
          }
          indeterminate={someChecked}
          value={value}
        />
      </Box>
      <CollapseLabel
        title={label}
        alignItems="center"
        isCollapsable={isCollapsable}
        {...(isCollapsable && {
          onClick,
          'aria-expanded': isActive,
          onKeyDown: ({ key }) => (key === 'Enter' || key === ' ') && onClick(),
          tabIndex: 0,
          role: 'button',
        })}
      >
        <Typography
          fontWeight={isActive ? 'bold' : undefined}
          textColor={isActive ? 'primary600' : 'neutral800'}
          ellipsis
        >
          {capitalise(label)}
        </Typography>
        {children}
      </CollapseLabel>
    </Flex>
  );
};

export { RowLabelWithCheckbox };
export type { RowLabelWithCheckboxProps };
