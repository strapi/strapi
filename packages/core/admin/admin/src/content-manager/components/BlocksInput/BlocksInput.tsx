import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { type MessageDescriptor, useIntl } from 'react-intl';
import styled from 'styled-components';

import { Hint, HintProps } from '../Hint';

import { BlocksEditor } from './BlocksEditor';

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

interface BlocksInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BlocksEditor>, 'placeholder'>,
    Pick<HintProps, 'hint'> {
  intlLabel: MessageDescriptor;
  attribute: { type: string; [key: string]: unknown };
  placeholder?: MessageDescriptor;
  description?: MessageDescriptor;
  labelAction?: React.ReactNode;
  required?: boolean;
}

const BlocksInput = React.forwardRef<{ focus: () => void }, BlocksInputProps>(
  (
    {
      intlLabel,
      labelAction,
      name,
      required = false,
      error = '',
      hint,
      placeholder,
      ...editorProps
    },
    forwardedRef
  ) => {
    const { formatMessage } = useIntl();
    const uniqueId = React.useId();
    const label = intlLabel.id ? formatMessage(intlLabel) : name;
    const formattedPlaceholder =
      placeholder &&
      formatMessage({ id: placeholder.id, defaultMessage: placeholder.defaultMessage });

    return (
      <>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Flex gap={1}>
            <Typography
              variant="pi"
              fontWeight="bold"
              textColor="neutral800"
              as="label"
              id={uniqueId}
            >
              {label}
              {required && (
                <Typography textColor="danger600" lineHeight="0px">
                  *
                </Typography>
              )}
            </Typography>
            {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
          </Flex>
          <BlocksEditor
            name={name}
            error={error}
            ref={forwardedRef}
            {...editorProps}
            ariaLabelId={uniqueId}
            placeholder={formattedPlaceholder}
          />
          <Hint hint={hint} name={name} error={error} />
        </Flex>
        {error && (
          <Box paddingTop={1}>
            <Typography variant="pi" textColor="danger600" data-strapi-field-error>
              {error}
            </Typography>
          </Box>
        )}
      </>
    );
  }
);

export { BlocksInput };
