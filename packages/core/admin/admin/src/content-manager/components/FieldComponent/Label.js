import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';

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
      <Row>
        <Text textColor="neutral800" htmlFor={id || name} small bold as="label">
          {label}
          {showNumberOfEntries && <>&nbsp;({numberOfEntries})</>}
        </Text>
        {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
      </Row>
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
