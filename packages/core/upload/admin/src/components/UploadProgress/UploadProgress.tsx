// TODO: find a better naming convention for the file that was an index file before
import { Flex, ProgressBar, Typography } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { UpdateFile } from '../../../../shared/contracts/files';

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

export interface UploadProgressProps {
  error?: UpdateFile.Response['error'] | Error | null;
  onCancel: () => void;
  progress?: number;
}

export const UploadProgress = ({ onCancel, progress = 0, error }: UploadProgressProps) => {
  const { formatMessage } = useIntl();

  return (
    <BoxWrapper alignItems="center" background={error ? 'danger100' : 'neutral150'} error={error}>
      {error ? (
        <Cross aria-label={error?.message} />
      ) : (
        <Flex direction="column" alignItems="center" gap={2} width="100%">
          <ProgressBar value={progress} />
          <Typography>{`${progress}/100%`}</Typography>

          <CancelButton type="button" onClick={onCancel}>
            <Flex gap={2}>
              <Typography variant="pi" tag="span" textColor="inherit">
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
