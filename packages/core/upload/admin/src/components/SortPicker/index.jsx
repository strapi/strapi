import React from 'react';

import { SingleSelect, SingleSelectOption, Box } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { sortOptions } from '../../constants';
import { getTrad } from '../../utils';

const SingleSelectWrapper = styled(Box)`
  div[role='combobox'] {
    cursor: pointer;
  }
`;

const SortPicker = ({ onChangeSort, value }) => {
  const { formatMessage } = useIntl();

  return (
   <SingleSelectWrapper>
      <SingleSelect
        size="S"
        value={value}
        onChange={(value) => onChangeSort(value)}
        aria-label={formatMessage({
          id: getTrad('sort.label'),
          defaultMessage: 'Sort by',
        })}
        placeholder={formatMessage({
          id: getTrad('sort.label'),
          defaultMessage: 'Sort by',
        })}
      >
        {sortOptions.map((filter) => (
          <SingleSelectOption key={filter.key} value={filter.value}>
            {formatMessage({ id: getTrad(filter.key), defaultMessage: `${filter.value}` })}
          </SingleSelectOption>
        ))}
      </SingleSelect>
    </SingleSelectWrapper>
  );
};

SortPicker.defaultProps = {
  value: undefined,
};

SortPicker.propTypes = {
  onChangeSort: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default SortPicker;
