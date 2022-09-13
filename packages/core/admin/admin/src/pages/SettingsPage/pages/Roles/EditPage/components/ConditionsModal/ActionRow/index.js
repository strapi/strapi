import React from 'react';
import PropTypes from 'prop-types';
import IS_DISABLED from 'ee_else_ce/pages/SettingsPage/pages/Roles/EditPage/components/ConditionsModal/ActionRow/utils/constants';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { MultiSelectNested } from '@strapi/design-system/Select';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { rowHeight } from '../../Permissions/utils/constants';

const FlexWrapper = styled(Flex)`
  height: ${rowHeight};
`;

const ActionRow = ({
  arrayOfOptionsGroupedByCategory,
  isFormDisabled,
  isGrey,
  label,
  name,
  onChange,
  value,
}) => {
  const { formatMessage } = useIntl();
  const options = arrayOfOptionsGroupedByCategory.reduce((arr, curr) => {
    const [label, children] = curr;
    const obj = {
      label: upperFirst(label),
      children: children.map((child) => ({
        label: child.displayName,
        value: child.id,
      })),
    };

    return [...arr, obj];
  }, []);

  // Output: ['value1', 'value2']
  const values = Object.values(value)
    .map((x) =>
      Object.entries(x)
        .filter(([, value]) => value)
        .map(([key]) => key)
    )
    .flat();

  // ! Only expects arrayOfOpt to be [['default', obj]] - might break in future changes
  const handleChange = (val) => {
    const [[, values]] = arrayOfOptionsGroupedByCategory;
    const formattedValues = values.reduce(
      (acc, curr) => ({ [curr.id]: val.includes(curr.id), ...acc }),
      {}
    );
    onChange(name, formattedValues);
  };

  return (
    <FlexWrapper as="li" background={isGrey ? 'neutral100' : 'neutral0'}>
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
          customizeContent={(values) => `${values.length} currently selected`}
          onChange={handleChange}
          value={values}
          options={options}
          disabled={isFormDisabled || IS_DISABLED}
        />
      </Box>
    </FlexWrapper>
  );
};

ActionRow.propTypes = {
  arrayOfOptionsGroupedByCategory: PropTypes.array.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  isGrey: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};
export default ActionRow;
