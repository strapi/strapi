import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const Label = ({ intlLabel, id, labelAction, link, name, numberOfEntries, isSingle }) => {
  const { formatMessage } = useIntl();
  const label = intlLabel?.id ? formatMessage(intlLabel) : name;

  return (
    <Flex justifyContent="space-between">
      <Flex>
        <Typography
          textColor="neutral800"
          htmlFor={id || name}
          variant="pi"
          fontWeight="bold"
          as="label"
        >
          {label}
          {!isSingle && <>&nbsp;({numberOfEntries})</>}
        </Typography>
        {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
      </Flex>
      {link}
    </Flex>
  );
};

Label.defaultProps = {
  id: undefined,
  labelAction: undefined,
  link: null,
  numberOfEntries: 0,
};

Label.propTypes = {
  id: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  isSingle: PropTypes.bool.isRequired,
  labelAction: PropTypes.element,
  link: PropTypes.element,
  name: PropTypes.string.isRequired,
  numberOfEntries: PropTypes.number,
};

export default Label;
