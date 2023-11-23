import React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { PlusCircle } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

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
        <Flex direction="column" gap={2}>
          <Flex justifyContent="center" style={{ cursor: isReadOnly ? 'not-allowed' : 'inherit' }}>
            <IconWrapper>
              <PlusCircle />
            </IconWrapper>
          </Flex>
          <Flex justifyContent="center">
            <Typography textColor="primary600" variant="pi" fontWeight="bold">
              {formatMessage({
                id: getTrad('components.empty-repeatable'),
                defaultMessage: 'No entry yet. Click on the button below to add one.',
              })}
            </Typography>
          </Flex>
        </Flex>
      </Box>
      {error?.id && (
        <Typography textColor="danger600" variant="pi">
          {formatMessage(error, { ...error.values })}
        </Typography>
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
