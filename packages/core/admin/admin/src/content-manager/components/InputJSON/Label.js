import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { FieldLabel } from '@strapi/design-system/Field';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const Label = ({ intlLabel, labelAction, name, required }) => {
  const { formatMessage } = useIntl();
  const label = intlLabel?.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  return (
    <Flex>
      <FieldLabel required={required}>{label}</FieldLabel>
      {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
    </Flex>
  );
};

Label.defaultProps = {
  id: undefined,
  intlLabel: undefined,
  labelAction: undefined,
  required: false,
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
  required: PropTypes.bool,
};

export default Label;
