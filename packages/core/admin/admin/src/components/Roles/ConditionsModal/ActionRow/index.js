import React from 'react';
import PropTypes from 'prop-types';
import { Row, TableLabel } from '@strapi/parts';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import ConditionsSelect from '../ConditionsSelect';

const RowWrapper = styled(Row)`
  height: ${52 / 16}rem;
`;

const ActionRow = ({
  arrayOfOptionsGroupedByCategory,
  isFormDisabled,
  isGrey,
  label,
  name,
  onCategoryChange,
  onChange,
  value,
}) => {
  const { formatMessage } = useIntl();

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
      <ConditionsSelect
        arrayOfOptionsGroupedByCategory={arrayOfOptionsGroupedByCategory}
        name={name}
        isFormDisabled={isFormDisabled}
        onCategoryChange={onCategoryChange}
        onChange={onChange}
        value={value}
      />
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
  onCategoryChange: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};
export default ActionRow;
