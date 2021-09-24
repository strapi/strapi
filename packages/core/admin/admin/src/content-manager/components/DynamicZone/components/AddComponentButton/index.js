/**
 *
 * AddComponentButton
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import AddIcon from '@strapi/icons/AddIconCircle';
import { BaseButton } from '@strapi/parts/BaseButton';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Text, ButtonText } from '@strapi/parts/Text';
import { getTrad } from '../../../../utils';

const StyledAddIcon = styled(AddIcon)`
  transform: ${({ $isOpen }) => ($isOpen ? 'rotate(45deg)' : 'rotate(0deg)')};
  > circle {
    fill: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.danger200 : theme.colors.neutral150};
  }
  > path {
    fill: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.danger600 : theme.colors.neutral600};
  }
`;

const StyledButton = styled(BaseButton)`
  border-radius: 26px;
  background: ${({ theme }) => theme.colors.neutral0};
  padding: ${({ theme }) => theme.spaces[3]};

  box-shadow: ${({ theme }) => theme.shadows.filterShadow};

  svg {
    height: ${({ theme }) => theme.spaces[6]};
    width: ${({ theme }) => theme.spaces[6]};
    > path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }
  &:hover {
    color: ${({ theme }) => theme.colors.primary600} !important;
    ${Text} {
      color: ${({ theme }) => theme.colors.primary600} !important;
    }

    ${StyledAddIcon} {
      > circle {
        fill: ${({ theme }) => theme.colors.primary600};
      }
      > path {
        fill: ${({ theme }) => theme.colors.neutral100};
      }
    }
  }
  &:active {
    ${Text} {
      color: ${({ theme }) => theme.colors.primary600};
    }
    ${StyledAddIcon} {
      > circle {
        fill: ${({ theme }) => theme.colors.primary600};
      }
      > path {
        fill: ${({ theme }) => theme.colors.neutral100};
      }
    }
  }
`;

const BoxFullHeight = styled(Box)`
  height: 100%;
`;

const AddComponentButton = ({
  hasError,
  hasMaxError,
  hasMinError,
  isDisabled,
  isOpen,
  label,
  missingComponentNumber,
  name,
  onClick,
}) => {
  const { formatMessage } = useIntl();
  const addLabel = formatMessage(
    {
      id: getTrad('components.DynamicZone.add-component'),
      defaultMessage: 'Add a component to {componentName}',
    },
    { componentName: label || name }
  );
  const closeLabel = formatMessage({ id: 'app.utils.close-label', defaultMessage: 'Close' });
  let buttonLabel = isOpen ? closeLabel : addLabel;

  if (hasMaxError && !isOpen) {
    buttonLabel = formatMessage({
      id: 'components.Input.error.validation.max',
      defaultMessage: 'The value is too high.',
    });
  }

  if (hasMinError && !isOpen) {
    buttonLabel = formatMessage(
      {
        id: getTrad(`components.DynamicZone.missing-components`),
        defaultMessage:
          'There {number, plural, =0 {are # missing components} one {is # missing component} other {are # missing components}}',
      },
      { number: missingComponentNumber }
    );
  }

  return (
    <>
      <Row justifyContent="center">
        <Box style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}>
          <StyledButton type="button" onClick={onClick} disabled={isDisabled} hasError={hasError}>
            <Row>
              <BoxFullHeight aria-hidden paddingRight={2}>
                <StyledAddIcon $isOpen={isOpen} $hasError={hasError && !isOpen} />
              </BoxFullHeight>
              <ButtonText textColor={hasError && !isOpen ? 'danger600' : 'neutral500'} small>
                {buttonLabel}
              </ButtonText>
            </Row>
          </StyledButton>
        </Box>
      </Row>
    </>
  );
};

AddComponentButton.defaultProps = {
  label: '',
  missingComponentNumber: 0,
};

AddComponentButton.propTypes = {
  label: PropTypes.string,
  hasError: PropTypes.bool.isRequired,
  hasMaxError: PropTypes.bool.isRequired,
  hasMinError: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  missingComponentNumber: PropTypes.number,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default AddComponentButton;
