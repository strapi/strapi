import React from 'react';

import { Tooltip } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

const Button = styled.button`
  border: none;
  padding: 0;
  background: transparent;
  svg {
    width: 12px;
    height: 12px;
    fill: ${({ theme }) => theme.colors.neutral500};
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
`;

const LabelAction = ({ title, icon }) => {
  const { formatMessage } = useIntl();

  return (
    <Tooltip description={formatMessage(title)}>
      <Button aria-label={formatMessage(title)} type="button">
        {icon}
      </Button>
    </Tooltip>
  );
};

LabelAction.propTypes = {
  icon: PropTypes.element.isRequired,
  title: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
};

export default LabelAction;
