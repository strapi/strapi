import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Text } from '@strapi/design-system/Text';

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const Label = ({ intlLabel, id, labelAction, name, numberOfEntries, showNumberOfEntries }) => {
  const { formatMessage } = useIntl();
  const label = intlLabel?.id ? formatMessage(intlLabel) : name;

  return (
    <Box paddingBottom={1}>
      <Flex>
        <Text textColor="neutral800" htmlFor={id || name} small bold as="label">
          {label}
          {showNumberOfEntries && <>&nbsp;({numberOfEntries})</>}
        </Text>
        {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
      </Flex>
    </Box>
  );
};

Label.defaultProps = {
  id: undefined,
  labelAction: undefined,
  numberOfEntries: 0,
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
  showNumberOfEntries: PropTypes.bool,
};

export default Label;
