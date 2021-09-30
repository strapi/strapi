import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import AddIcon from '@strapi/icons/AddIconCircle';
import { Box } from '@strapi/parts/Box';
import { BaseButton } from '@strapi/parts/BaseButton';
import { Stack } from '@strapi/parts/Stack';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { pxToRem } from '@strapi/helper-plugin';
import { getTrad } from '../../utils';

const IconButton = styled(BaseButton)`
  border: none;
  padding: 0;
  background: transparent;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  > svg {
    width: ${pxToRem(24)};
    height: ${pxToRem(24)};
    > circle {
      fill: ${({ theme }) => theme.colors.primary200}!important;
    }
    > path {
      fill: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

const ComponentInitializer = ({ isReadOnly, onClick }) => {
  const { formatMessage } = useIntl();

  return (
    <Box
      background="neutral100"
      hasRadius
      borderColor="neutral200"
      paddingTop={9}
      paddingBottom={9}
    >
      <Stack size={2}>
        <Row justifyContent="center" style={{ cursor: isReadOnly ? 'not-allowed' : 'inherit' }}>
          <IconButton disabled={isReadOnly} onClick={onClick}>
            <AddIcon />
          </IconButton>
        </Row>
        <Row justifyContent="center">
          <Text textColor="primary600" small bold>
            {formatMessage({
              id: getTrad('components.empty-repeatable'),
              defaultMessage: 'No entry yet. Click on the button below to add one.',
            })}
          </Text>
        </Row>
      </Stack>
    </Box>
  );
};

ComponentInitializer.defaultProps = {
  isReadOnly: false,
};

ComponentInitializer.propTypes = {
  isReadOnly: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export default ComponentInitializer;
