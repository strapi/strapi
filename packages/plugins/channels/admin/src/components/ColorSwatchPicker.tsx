import { Flex, VisuallyHidden } from '@strapi/design-system';
import { styled } from 'styled-components';

import { CHANNEL_COLOR_PALETTE } from '../constants';

const Swatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  border: 2px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.neutral800 : 'transparent')};
  background: ${({ $color }) => $color};
  cursor: pointer;
`;

interface ColorSwatchPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

/** Preset color swatches shared by the channel create/edit pages. */
export const ColorSwatchPicker = ({ value, onChange, disabled }: ColorSwatchPickerProps) => (
  <Flex gap={2} wrap="wrap">
    {CHANNEL_COLOR_PALETTE.map((candidate) => (
      <Swatch
        key={candidate}
        type="button"
        $color={candidate}
        $selected={candidate === value}
        disabled={disabled}
        onClick={() => onChange(candidate)}
      >
        <VisuallyHidden>{candidate}</VisuallyHidden>
      </Swatch>
    ))}
  </Flex>
);
