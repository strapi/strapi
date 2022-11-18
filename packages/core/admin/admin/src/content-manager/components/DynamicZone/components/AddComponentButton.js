/**
 *
 * AddComponentButton
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import PlusCircle from '@strapi/icons/PlusCircle';
import { BaseButton } from '@strapi/design-system/BaseButton';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';

import { getTrad } from '../../../utils';

const StyledAddIcon = styled(PlusCircle)`
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
  border-color: ${({ theme }) => theme.colors.neutral150};
  background: ${({ theme }) => theme.colors.neutral0};
  padding-top: ${({ theme }) => theme.spaces[3]};
  padding-right: ${({ theme }) => theme.spaces[4]};
  padding-bottom: ${({ theme }) => theme.spaces[3]};
  padding-left: ${({ theme }) => theme.spaces[4]};

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
    ${Typography} {
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
    ${Typography} {
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
    <Flex justifyContent="center">
      <Box style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}>
        <StyledButton type="button" onClick={onClick} disabled={isDisabled} hasError={hasError}>
          <Flex>
            <BoxFullHeight aria-hidden paddingRight={2}>
              <StyledAddIcon $isOpen={isOpen} $hasError={hasError && !isOpen} />
            </BoxFullHeight>
            <Typography
              variant="pi"
              fontWeight="bold"
              textColor={hasError && !isOpen ? 'danger600' : 'neutral500'}
            >
              {buttonLabel}
            </Typography>
          </Flex>
        </StyledButton>
      </Box>
    </Flex>
  );
};

AddComponentButton.defaultProps = {
  hasError: false,
  hasMaxError: false,
  hasMinError: false,
  isDisabled: false,
  isOpen: false,
  label: '',
  missingComponentNumber: 0,
};

AddComponentButton.propTypes = {
  label: PropTypes.string,
  hasError: PropTypes.bool,
  hasMaxError: PropTypes.bool,
  hasMinError: PropTypes.bool,
  isDisabled: PropTypes.bool,
  isOpen: PropTypes.bool,
  missingComponentNumber: PropTypes.number,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default AddComponentButton;
