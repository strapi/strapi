import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { BaseButton } from '@strapi/design-system/BaseButton';
import { Field, FieldHint, FieldError, FieldLabel, FieldInput } from '@strapi/design-system/Field';
import CarretDown from '@strapi/icons/CarretDown';
import { useIntl } from 'react-intl';
import { HexColorPicker } from 'react-colorful';
import useOnClickOutside from '../../../hooks/useOnClickOutside';
import getTrad from '../../../utils/getTrad';

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
    height: 152px;
  }

  .react-colorful__pointer {
    width: ${({ theme }) => theme.spaces[3]};
    height: ${({ theme }) => theme.spaces[3]};
  }

  .react-colorful__saturation {
    border-radius: ${({ theme }) => theme.spaces[1]};
    margin-bottom: ${({ theme }) => theme.spaces[2]};
  }

  .react-colorful__hue {
    border-radius: 10px;
    height: ${({ theme }) => theme.spaces[3]};
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

const ColorPickerInput = ({
  attribute,
  description,
  disabled,
  error,
  intlLabel,
  labelAction,
  name,
  onChange,
  required,
  value,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef();
  const colorPickerButtonRef = useRef();
  const { formatMessage } = useIntl();
  const color = value || '#ffffff';
  const styleUpcase = { textTransform: 'uppercase' };

  const listener = (event) => {
    if (
      !colorPickerRef.current ||
      colorPickerRef.current.contains(event.target) ||
      colorPickerButtonRef.current.contains(event.target)
    ) {
      // Do nothing if the click involves color picker refs
      return;
    }

    setShowColorPicker(false);
  };

  useOnClickOutside(colorPickerRef, listener);

  return (
    <Field
      name={name}
      id={name}
      // GenericInput calls formatMessage and returns a string for the error
      error={error}
      hint={description && formatMessage(description)}
    >
      <Stack spacing={1}>
        <Flex>
          <FieldLabel required={required}>{formatMessage(intlLabel)}</FieldLabel>
          {labelAction && <Box paddingLeft={1}>{labelAction}</Box>}
        </Flex>
        <ColorPickerToggle
          ref={colorPickerButtonRef}
          disabled={disabled}
          onClick={() => setShowColorPicker(!showColorPicker)}
        >
          <Flex>
            <ColorPreview color={color} />
            <Typography style={styleUpcase} variant="omega">
              {color}
            </Typography>
          </Flex>
          <CarretDown />
        </ColorPickerToggle>
        {showColorPicker && (
          <Box
            ref={colorPickerRef}
            width="240px"
            padding={2}
            background="neutral0"
            borderColor="neutral200"
            shadow="filterShadow"
            hasRadius
          >
            <ColorPicker
              color={color}
              onChange={(hexValue) =>
                onChange({ target: { name, value: hexValue, type: attribute.type } })
              }
            />
            <Flex paddingTop={2} paddingLeft={4} justifyContent="flex-end">
              <Box paddingRight={2}>
                <Typography variant="omega">
                  {formatMessage({ id: getTrad('input.format'), defaultMessage: 'HEX' })}
                </Typography>
              </Box>
              <FieldInput style={styleUpcase} value={color} onChange={onChange} />
            </Flex>
          </Box>
        )}
        <FieldHint />
        <FieldError />
      </Stack>
    </Field>
  );
};

ColorPickerInput.defaultProps = {
  description: null,
  disabled: false,
  error: null,
  labelAction: null,
  required: false,
  value: '',
};

ColorPickerInput.propTypes = {
  intlLabel: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  attribute: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.object,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  labelAction: PropTypes.object,
  required: PropTypes.bool,
  value: PropTypes.string,
};

export default ColorPickerInput;
