import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const Label = ({ id, intlLabel, labelAction, name }) => {
  const { formatMessage } = useIntl();
  const label = intlLabel?.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  return (
    <Flex>
      <Typography
        textColor="neutral800"
        htmlFor={id || name}
        variant="pi"
        fontWeight="bold"
        as="label"
      >
        {label}
      </Typography>
      {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
    </Flex>
  );
};

Label.defaultProps = {
  id: undefined,
  intlLabel: undefined,
  labelAction: undefined,
};

Label.propTypes = {
  id: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
};

export default Label;
