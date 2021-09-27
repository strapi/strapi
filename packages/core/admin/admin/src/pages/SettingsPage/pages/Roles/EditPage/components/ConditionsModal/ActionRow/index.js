import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { TableLabel } from '@strapi/parts/Text';
import { MultiSelectNested } from '@strapi/parts/Select';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { rowHeight } from '../../Permissions/utils/constants';

const RowWrapper = styled(Row)`
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
      children: children.map(child => ({
        label: child.displayName,
        value: child.id,
      })),
    };

    return [...arr, obj];
  }, []);

  // Output: ['value1', 'value2']
  const values = Object.values(value)
    .map(x =>
      Object.entries(x)
        .filter(([, value]) => value)
        .map(([key]) => key)
    )
    .flat();

  // ! Only expects arrayOfOpt to be [['default', obj]] - might break in future changes
  const handleChange = val => {
    const [[, values]] = arrayOfOptionsGroupedByCategory;
    const formattedValues = values.reduce(
      (acc, curr) => ({ [curr.id]: val.includes(curr.id), ...acc }),
      {}
    );
    onChange(name, formattedValues);
  };

  return (
    <RowWrapper as="li" background={isGrey ? 'neutral100' : 'neutral0'}>
      <Row paddingLeft={6} style={{ width: 180 }}>
        <TableLabel textColor="neutral600">
          {formatMessage({
            id: 'Settings.permissions.conditions.can',
            defaultMessage: 'Can',
          })}
          &nbsp;
        </TableLabel>
        <TableLabel
          title={label}
          textColor="primary600"
          // ! REMOVE THIS WHEN DS IS UPDATED WITH ELLIPSIS PROP
          style={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {formatMessage({
            id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
            defaultMessage: label,
          })}
        </TableLabel>
        <TableLabel textColor="neutral600">
          &nbsp;
          {formatMessage({
            id: 'Settings.permissions.conditions.when',
            defaultMessage: 'When',
          })}
        </TableLabel>
      </Row>
      <Box style={{ maxWidth: 430, width: '100%' }}>
        <MultiSelectNested
          id={name}
          customizeContent={values => `${values.length} currently selected`}
          onChange={handleChange}
          value={values}
          options={options}
          disabled={isFormDisabled}
        />
      </Box>
    </RowWrapper>
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
