import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import AddIcon from '@strapi/icons/AddIcon';
import { pxToRem } from '@strapi/helper-plugin';
import { getTrad } from '../../utils';

const StyledButton = styled(Box)`
  width: 100%;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral200};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
`;

const StyledIcon = styled(AddIcon)`
  width: ${pxToRem(10)};
  height: ${pxToRem(10)};
  margin-right: ${({ theme }) => theme.spaces[2]};

  > path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

const Button = ({ disabled, onClick }) => {
  const { formatMessage } = useIntl();

  return (
    <StyledButton
      as="button"
      disabled={disabled}
      type="button"
      paddingTop={2}
      paddingBottom={2}
      onClick={onClick}
    >
      <Row justifyContent="center">
        <Text textColor="primary600" bold>
          <StyledIcon />
          {formatMessage({
            id: getTrad('containers.EditView.add.new-entry'),
            defaultMessage: 'Add an entry',
          })}
        </Text>
      </Row>
    </StyledButton>
  );
};

Button.propTypes = {
  disabled: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default Button;
