import { Flex, VisuallyHidden } from '@strapi/design-system';
import { styled } from 'styled-components';

export const SPACE_COLOR_PALETTE = [
  '#4945FF',
  '#EE5E52',
  '#328048',
  '#D9822F',
  '#7B79FF',
  '#0C75AF',
  '#BE5D01',
  '#8312D1',
];

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
}

/** Preset color swatches shared by the workspace create/edit modals. */
export const ColorSwatchPicker = ({ value, onChange }: ColorSwatchPickerProps) => (
  <Flex gap={2} wrap="wrap">
    {SPACE_COLOR_PALETTE.map((candidate) => (
      <Swatch
        key={candidate}
        type="button"
        $color={candidate}
        $selected={candidate === value}
        onClick={() => onChange(candidate)}
      >
        <VisuallyHidden>{candidate}</VisuallyHidden>
      </Swatch>
    ))}
  </Flex>
);
