import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import AddIcon from '@strapi/icons/AddIconCircle';
import { Box } from '@strapi/parts/Box';
import { Stack } from '@strapi/parts/Stack';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { useCMEditViewDataManager, pxToRem } from '@strapi/helper-plugin';
import { getTrad } from '../../../utils';

const IconButton = styled.button`
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

const ComponentInitializer = ({ componentUid, isReadOnly, name }) => {
  const { formatMessage } = useIntl();
  const { addNonRepeatableComponentToField } = useCMEditViewDataManager();
  const handleClick = () => {
    addNonRepeatableComponentToField(name, componentUid);
  };

  return (
    <Box
      background="neutral100"
      hasRadius
      borderColor="neutral200"
      paddingTop={9}
      paddingBottom={9}
    >
      <Stack size={2}>
        <Row justifyContent="center">
          <IconButton disabled={isReadOnly} onClick={handleClick}>
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
  name: '',
};

ComponentInitializer.propTypes = {
  componentUid: PropTypes.string.isRequired,
  isReadOnly: PropTypes.bool,
  name: PropTypes.string,
};

export default ComponentInitializer;
