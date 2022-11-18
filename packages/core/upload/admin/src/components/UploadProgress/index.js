import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Cross from '@strapi/icons/Cross';
import { Typography, Box, Flex, ProgressBar } from '@strapi/design-system';
import { useIntl } from 'react-intl';

const BoxWrapper = styled(Flex)`
  width: 100%;
  height: 100%;
  flex-direction: column;

  svg {
    path {
      fill: ${({ theme, error }) => (error ? theme.colors.danger600 : undefined)};
    }
  }
`;

const CancelButton = styled.button`
  border: none;
  background: none;
  display: flex;
  align-items: center;

  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral200};
    }

    height: 10px;
    width: 10px;
  }
`;

export const UploadProgress = ({ onCancel, progress, error }) => {
  const { formatMessage } = useIntl();

  return (
    <BoxWrapper
      background={error ? 'danger100' : 'neutral700'}
      justifyContent="center"
      error={error}
      hasRadius
    >
      {error ? (
        <Cross aria-label={error?.message} />
      ) : (
        <>
          <Box paddingBottom={2}>
            <ProgressBar value={progress} size="S">
              {`${progress}/100%`}
            </ProgressBar>
          </Box>

          <CancelButton type="button" onClick={onCancel}>
            <Typography variant="pi" as="span" textColor="neutral200">
              {formatMessage({
                id: 'app.components.Button.cancel',
                defaultMessage: 'Cancel',
              })}
            </Typography>
            <Box as="span" paddingLeft={2} aria-hidden>
              <Cross />
            </Box>
          </CancelButton>
        </>
      )}
    </BoxWrapper>
  );
};

UploadProgress.defaultProps = {
  error: undefined,
  progress: 0,
};

UploadProgress.propTypes = {
  error: PropTypes.instanceOf(Error),
  onCancel: PropTypes.func.isRequired,
  progress: PropTypes.number,
};
