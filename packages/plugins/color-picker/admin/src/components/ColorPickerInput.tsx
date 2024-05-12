import * as React from 'react';

import {
  BaseButton,
  Box,
  Field,
  FieldError,
  FieldHint,
  FieldInput,
  FieldLabel,
  Flex,
  FocusTrap,
  Popover,
  Typography,
} from '@strapi/design-system';
import { CarretDown } from '@strapi/icons';
import { HexColorPicker } from 'react-colorful';
import { useIntl, MessageDescriptor } from 'react-intl';
import styled from 'styled-components';

import { useComposedRefs } from '../hooks/useComposeRefs';
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

const ColorPickerToggle = styled(BaseButton)`
  display: flex;
  justify-content: space-between;
  align-items: center;

  svg {
    width: ${({ theme }) => theme.spaces[2]};
    height: ${({ theme }) => theme.spaces[2]};
  }

  svg > path {
    fill: ${({ theme }) => theme.colors.neutral500};
    justify-self: flex-end;
  }
`;

const ColorPickerPopover = styled(Popover)`
  padding: ${({ theme }) => theme.spaces[2]};
  min-height: 270px;
`;

/**
 * TODO: A lot of these props should extend `FieldProps`
 */
interface ColorPickerInputProps {
  intlLabel: MessageDescriptor;
  /**
   * TODO: this should be extended from `FieldInputProps['onChange']
   * but that conflicts with it's secondary usage in `HexColorPicker`
   */
  onChange: (event: { target: { name: string; value: string; type: string } }) => void;
  attribute: { type: string; [key: string]: unknown };
  name: string;
  description?: MessageDescriptor;
  disabled?: boolean;
  error?: string;
  labelAction?: React.ReactNode;
  required?: boolean;
  value?: string;
}

export const ColorPickerInput = React.forwardRef<HTMLButtonElement, ColorPickerInputProps>(
  (
    {
      attribute,
      description,
      disabled = false,
      error,
      intlLabel,
      labelAction,
      name,
      onChange,
      required = false,
      value = '',
    },
    forwardedRef
  ) => {
    const [showColorPicker, setShowColorPicker] = React.useState(false);
    const colorPickerButtonRef = React.useRef<HTMLButtonElement>(null!);
    const { formatMessage } = useIntl();
    const color = value || '#000000';

    const handleBlur: React.FocusEventHandler<HTMLDivElement> = (e) => {
      e.preventDefault();

      if (!e.currentTarget.contains(e.relatedTarget)) {
        setShowColorPicker(false);
      }
    };

    const composedRefs = useComposedRefs(forwardedRef, colorPickerButtonRef);

    return (
      <Field
        name={name}
        id={name}
        // GenericInput calls formatMessage and returns a string for the error
        error={error}
        hint={description && formatMessage(description)}
        required={required}
      >
        <Flex direction="column" alignItems="stretch" gap={1}>
          <FieldLabel action={labelAction}>{formatMessage(intlLabel)}</FieldLabel>
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
            onClick={() => setShowColorPicker(!showColorPicker)}
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
            <CarretDown aria-hidden />
          </ColorPickerToggle>
          {showColorPicker && (
            <ColorPickerPopover
              onBlur={handleBlur}
              role="dialog"
              source={colorPickerButtonRef}
              spacing={4}
            >
              <FocusTrap onEscape={() => setShowColorPicker(false)}>
                <ColorPicker
                  color={color}
                  onChange={(hexValue) =>
                    onChange({ target: { name, value: hexValue, type: attribute.type } })
                  }
                />
                <Flex paddingTop={3} paddingLeft={4} justifyContent="flex-end">
                  <Box paddingRight={2}>
                    <Typography variant="omega" as="label" textColor="neutral600">
                      {formatMessage({
                        id: getTrad('color-picker.input.format'),
                        defaultMessage: 'HEX',
                      })}
                    </Typography>
                  </Box>
                  <FieldInput
                    id="color-picker-value"
                    aria-label={formatMessage({
                      id: getTrad('color-picker.input.aria-label'),
                      defaultMessage: 'Color picker input',
                    })}
                    style={{ textTransform: 'uppercase' }}
                    value={value}
                    placeholder="#000000"
                    onChange={onChange}
                  />
                </Flex>
              </FocusTrap>
            </ColorPickerPopover>
          )}
          <FieldHint />
          <FieldError />
        </Flex>
      </Field>
    );
  }
);
