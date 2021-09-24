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

const Icon = styled(AddIcon)`
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
  &:hover {
    color: ${({ theme }) => theme.colors.primary600} !important;
    ${Text} {
      color: ${({ theme }) => theme.colors.primary600} !important;
    }

    ${Icon} {
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
    ${Icon} {
      > circle {
        fill: ${({ theme }) => theme.colors.primary600};
      }
      > path {
        fill: ${({ theme }) => theme.colors.neutral100};
      }
    }
  }
  svg {
    height: ${({ theme }) => theme.spaces[6]};
    width: ${({ theme }) => theme.spaces[6]};
  }
`;

const BoxFullHeight = styled(Box)`
  height: 100%;
`;

const AddComponentButton = ({ label, name, onClick }) => {
  const { formatMessage } = useIntl();
  const intlLabel = formatMessage(
    {
      id: getTrad('components.DynamicZone.add-component'),
      defaultMessage: 'Add a component to {componentName}',
    },
    { componentName: label || name }
  );

  return (
    <Row justifyContent="center">
      <StyledButton type="button" onClick={onClick}>
        <Row>
          <BoxFullHeight aria-hidden paddingRight={2}>
            <Icon />
          </BoxFullHeight>
          <ButtonText textColor="neutral500" small>
            {intlLabel}
          </ButtonText>
        </Row>
      </StyledButton>
    </Row>
  );
};

AddComponentButton.defaultProps = {
  label: '',
};

AddComponentButton.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default AddComponentButton;
