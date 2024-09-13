import * as React from 'react';

import {
  Button,
  Box,
  Field,
  Flex,
  Popover,
  Typography,
  useComposedRefs,
} from '@strapi/design-system';
import { CaretDown } from '@strapi/icons';
import { useField, type InputProps, type FieldValue } from '@strapi/strapi/admin';
import { HexColorPicker } from 'react-colorful';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../utils/getTrad';

const ColorPreview = styled.div`
  border-radius: 50%;
  width: 20px;
  height: 20px;
  margin-right: 10px;
  background-color: ${(props) => props.color};
  border: 1px solid rgba(0, 0, 0, 0.1);
`;

const ColorPicker = styled(HexColorPicker)`
  && {
    width: 100%;
    aspect-ratio: 1.5;
  }

  .react-colorful__pointer {
    width: ${({ theme }) => theme.spaces[3]};
    height: ${({ theme }) => theme.spaces[3]};
  }

  .react-colorful__saturation {
    border-radius: ${({ theme }) => theme.spaces[1]};
    border-bottom: none;
  }

  .react-colorful__hue {
    border-radius: 10px;
    height: ${({ theme }) => theme.spaces[3]};
    margin-top: ${({ theme }) => theme.spaces[2]};
  }
`;

const ColorPickerToggle = styled(Button)`
  & > span {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  svg {
    width: ${({ theme }) => theme.spaces[2]};
    height: ${({ theme }) => theme.spaces[2]};
  }

  svg > path {
    fill: ${({ theme }) => theme.colors.neutral500};
    justify-self: flex-end;
  }
`;

const ColorPickerPopover = styled(Popover.Content)`
  padding: ${({ theme }) => theme.spaces[2]};
  min-height: 270px;
`;

type ColorPickerInputProps = InputProps &
  FieldValue & {
    labelAction?: React.ReactNode;
  };

export const ColorPickerInput = React.forwardRef<HTMLButtonElement, ColorPickerInputProps>(
  (
    { hint, disabled = false, labelAction, label, name, required = false, onChange, value, error },
    forwardedRef
  ) => {
    const [showColorPicker, setShowColorPicker] = React.useState(false);
    const colorPickerButtonRef = React.useRef<HTMLButtonElement>(null!);
    const { formatMessage } = useIntl();
    const color = value || '#000000';

    const composedRefs = useComposedRefs(forwardedRef, colorPickerButtonRef);

    return (
      <Field.Root name={name} id={name} error={error} hint={hint} required={required}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Field.Label action={labelAction}>{label}</Field.Label>
          <Popover.Root onOpenChange={setShowColorPicker}>
            <Popover.Trigger>
              <ColorPickerToggle
                ref={composedRefs}
                aria-label={formatMessage({
                  id: getTrad('color-picker.toggle.aria-label'),
                  defaultMessage: 'Color picker toggle',
                })}
                aria-controls="color-picker-value"
                aria-haspopup="dialog"
                aria-expanded={showColorPicker}
                aria-disabled={disabled}
                disabled={disabled}
                variant="tertiary"
                size="L"
              >
                <Flex>
                  <ColorPreview color={color} />
                  <Typography
                    style={{ textTransform: 'uppercase' }}
                    textColor={value ? undefined : 'neutral600'}
                    variant="omega"
                  >
                    {color}
                  </Typography>
                </Flex>
                <CaretDown aria-hidden />
              </ColorPickerToggle>
            </Popover.Trigger>
            <ColorPickerPopover sideOffset={4}>
              <ColorPicker color={color} onChange={(hexValue) => onChange(name, hexValue)} />
              <Flex paddingTop={3} paddingLeft={4} justifyContent="flex-end">
                <Box paddingRight={2}>
                  <Typography variant="omega" tag="label" textColor="neutral600">
                    {formatMessage({
                      id: getTrad('color-picker.input.format'),
                      defaultMessage: 'HEX',
                    })}
                  </Typography>
                </Box>
                <Field.Root>
                  <Field.Input
                    aria-label={formatMessage({
                      id: getTrad('color-picker.input.aria-label'),
                      defaultMessage: 'Color picker input',
                    })}
                    style={{ textTransform: 'uppercase' }}
                    value={value}
                    placeholder="#000000"
                    onChange={onChange}
                  />
                </Field.Root>
              </Flex>
            </ColorPickerPopover>
          </Popover.Root>
          <Field.Hint />
          <Field.Error />
        </Flex>
      </Field.Root>
    );
  }
);
