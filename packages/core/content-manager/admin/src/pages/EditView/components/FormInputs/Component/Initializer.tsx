import * as React from 'react';

import { useField } from '@strapi/admin/strapi-admin';
import { Box, Flex, TextButton, Typography } from '@strapi/design-system';
import { Duplicate, PlusCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../../../utils/translations';

interface InitializerProps {
  disabled?: boolean;
  name: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement> & React.MouseEventHandler<HTMLDivElement>;
  onCopyClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const Initializer = ({ disabled, name, onClick, onCopyClick }: InitializerProps) => {
  const { formatMessage } = useIntl();

  const field = useField(name);

  return (
    <>
      <Box
        tag="button"
        background={disabled ? 'neutral150' : 'neutral100'}
        borderColor={field.error ? 'danger600' : 'neutral200'}
        hasRadius
        disabled={disabled}
        onClick={onClick}
        paddingTop={9}
        paddingBottom={9}
        type="button"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <Flex direction="column" gap={2}>
          <Flex justifyContent="center" color={disabled ? 'neutral500' : 'primary600'}>
            <PlusCircle width="3.2rem" height="3.2rem" />
          </Flex>
          <Flex justifyContent="center">
            <Typography
              textColor={disabled ? 'neutral600' : 'primary600'}
              variant="pi"
              fontWeight="bold"
            >
              {formatMessage({
                id: getTranslation('components.empty-repeatable'),
                defaultMessage: 'No entry yet. Click to add one.',
              })}
            </Typography>
          </Flex>
        </Flex>
      </Box>
      {onCopyClick && (
        <Flex justifyContent="center" paddingTop={3}>
          <TextButton disabled={disabled} startIcon={<Duplicate />} onClick={onCopyClick}>
            {formatMessage({
              id: getTranslation('components.copy-from-existing'),
              defaultMessage: 'Copy from existing',
            })}
          </TextButton>
        </Flex>
      )}
    </>
  );
};

export { Initializer };
export type { InitializerProps };
