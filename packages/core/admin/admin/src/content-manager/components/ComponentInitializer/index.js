import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import PlusCircle from '@strapi/icons/PlusCircle';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { Text } from '@strapi/design-system/Text';
import { pxToRem } from '@strapi/helper-plugin';
import { getTrad } from '../../utils';

const IconWrapper = styled.span`
  > svg {
    width: ${pxToRem(24)};
    height: ${pxToRem(24)};
    > circle {
      fill: ${({ theme }) => theme.colors.primary200};
    }
    > path {
      fill: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

const ComponentInitializer = ({ error, isReadOnly, onClick }) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Box
        as="button"
        background="neutral100"
        borderColor={error ? 'danger600' : 'neutral200'}
        disabled={isReadOnly}
        hasRadius
        onClick={onClick}
        paddingTop={9}
        paddingBottom={9}
        type="button"
      >
        <Stack size={2}>
          <Flex justifyContent="center" style={{ cursor: isReadOnly ? 'not-allowed' : 'inherit' }}>
            <IconWrapper>
              <PlusCircle />
            </IconWrapper>
          </Flex>
          <Flex justifyContent="center">
            <Text textColor="primary600" small bold>
              {formatMessage({
                id: getTrad('components.empty-repeatable'),
                defaultMessage: 'No entry yet. Click on the button below to add one.',
              })}
            </Text>
          </Flex>
        </Stack>
      </Box>
      {error?.id && (
        <Text textColor="danger600" small>
          {formatMessage(
            {
              id: error.id,
              defaultMessage: error.defaultMessage,
            },
            error.values
          )}
        </Text>
      )}
    </>
  );
};

ComponentInitializer.defaultProps = {
  error: undefined,
  isReadOnly: false,
};

ComponentInitializer.propTypes = {
  error: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  isReadOnly: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export default ComponentInitializer;
