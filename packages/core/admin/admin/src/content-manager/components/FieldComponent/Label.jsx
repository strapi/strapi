import React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const Label = ({
  intlLabel,
  id,
  labelAction,
  name,
  numberOfEntries,
  showNumberOfEntries,
  required,
}) => {
  const { formatMessage } = useIntl();
  const label = intlLabel?.id ? formatMessage(intlLabel) : name;

  return (
    <Box paddingBottom={1}>
      <Flex>
        <Typography
          textColor="neutral800"
          htmlFor={id || name}
          variant="pi"
          fontWeight="bold"
          as="label"
        >
          {label}
          {showNumberOfEntries && <>&nbsp;({numberOfEntries})</>}
          {required && <Typography textColor="danger600">*</Typography>}
        </Typography>
        {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
      </Flex>
    </Box>
  );
};

Label.defaultProps = {
  id: undefined,
  labelAction: undefined,
  numberOfEntries: 0,
  required: false,
  showNumberOfEntries: false,
};

Label.propTypes = {
  id: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  numberOfEntries: PropTypes.number,
  required: PropTypes.bool,
  showNumberOfEntries: PropTypes.bool,
};

export default Label;
