/**
 *
 * PageSize
 *
 */

import React from 'react';

import { Box, Flex, SingleSelectOption, SingleSelect, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const PageSize = ({ onChangePageSize, pageSize }) => {
  const { formatMessage } = useIntl();

  const handleChange = (value) => {
    onChangePageSize(value);
  };

  return (
    <Flex>
      <SingleSelect
        size="S"
        aria-label={formatMessage({
          id: 'components.PageFooter.select',
          defaultMessage: 'Entries per page',
        })}
        onChange={handleChange}
        value={pageSize.toString()}
      >
        <SingleSelectOption value="10">10</SingleSelectOption>
        <SingleSelectOption value="20">20</SingleSelectOption>
        <SingleSelectOption value="50">50</SingleSelectOption>
        <SingleSelectOption value="100">100</SingleSelectOption>
      </SingleSelect>
      <Box paddingLeft={2}>
        <Typography textColor="neutral600" tag="label" htmlFor="page-size">
          {formatMessage({
            id: 'components.PageFooter.select',
            defaultMessage: 'Entries per page',
          })}
        </Typography>
      </Box>
    </Flex>
  );
};

PageSize.propTypes = {
  onChangePageSize: PropTypes.func.isRequired,
  pageSize: PropTypes.number.isRequired,
};

export default PageSize;
