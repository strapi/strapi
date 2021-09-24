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
  transform: ${({ $isopen }) => ($isopen ? 'rotate(45deg)' : 'rotate(0deg)')};
  > circle {
    fill: ${({ theme }) => theme.colors.neutral150};
  }
  > path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

const StyledButton = styled(BaseButton)`
  border-radius: 26px;
  background: ${({ theme }) => theme.colors.neutral0};
  padding: ${({ theme }) => theme.spaces[3]};
  border: 0;
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

const AddComponentButton = ({ isDisabled, isOpen, label, name, onClick }) => {
  const { formatMessage } = useIntl();
  const addLabel = formatMessage(
    {
      id: getTrad('components.DynamicZone.add-component'),
      defaultMessage: 'Add a component to {componentName}',
    },
    { componentName: label || name }
  );
  const closeLabel = formatMessage({ id: 'app.utils.close-label', defaultMessage: 'Close' });

  return (
    <Row justifyContent="center">
      <Box
        paddingTop={6}
        paddingBottom={6}
        style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
      >
        <StyledButton type="button" onClick={onClick} disabled={isDisabled}>
          <Row>
            <BoxFullHeight aria-hidden paddingRight={2}>
              <StyledAddIcon $isopen={isOpen} />
            </BoxFullHeight>
            <ButtonText textColor="neutral500" small>
              {isOpen ? closeLabel : addLabel}
            </ButtonText>
          </Row>
        </StyledButton>
      </Box>
    </Row>
  );
};

AddComponentButton.defaultProps = {
  label: '',
};

AddComponentButton.propTypes = {
  label: PropTypes.string,
  isDisabled: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default AddComponentButton;
