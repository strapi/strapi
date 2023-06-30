import React from 'react';

import { Flex, ProgressBar, Typography } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

const BoxWrapper = styled(Flex)`
  border-radius: ${({ theme }) => `${theme.borderRadius} ${theme.borderRadius} 0 0`};
  width: 100%;
  height: 100%;

  svg {
    path {
      fill: ${({ theme, error }) => (error ? theme.colors.danger600 : undefined)};
    }
  }
`;

const CancelButton = styled.button`
  border: none;
  background: none;
  width: min-content;
  color: ${({ theme }) => theme.colors.neutral600};

  &:hover,
  &:focus {
    color: ${({ theme }) => theme.colors.neutral700};
  }

  svg {
    height: 10px;
    width: 10px;

    path {
      fill: currentColor;
    }
  }
`;

export const UploadProgress = ({ onCancel, progress, error }) => {
  const { formatMessage } = useIntl();

  return (
    <BoxWrapper alignItems="center" background={error ? 'danger100' : 'neutral150'} error={error}>
      {error ? (
        <Cross aria-label={error?.message} />
      ) : (
        <Flex direction="column" alignItems="center" gap={2} width="100%">
          <ProgressBar value={progress}>{`${progress}/100%`}</ProgressBar>

          <CancelButton type="button" onClick={onCancel}>
            <Flex gap={2}>
              <Typography variant="pi" as="span" textColor="inherit">
                {formatMessage({
                  id: 'app.components.Button.cancel',
                  defaultMessage: 'Cancel',
                })}
              </Typography>

              <Cross aria-hidden />
            </Flex>
          </CancelButton>
        </Flex>
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
