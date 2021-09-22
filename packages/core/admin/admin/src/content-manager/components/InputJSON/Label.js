import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Text } from '@strapi/parts/Text';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';

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
    <Row>
      <Text textColor="neutral800" htmlFor={id || name} small bold as="label">
        {label}
      </Text>
      {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
    </Row>
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
