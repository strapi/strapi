import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { GridFour as GridIcon, List } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../utils/translations';
import { viewOptions } from '../constants';

/**
 * Mirrors the design-system Toggle look (grey track, white active segment
 * card) — reproduced locally because the DS component is a labels-only
 * boolean input (no icons) and paints its left segment in danger red. Here
 * both segments use the primary blue when active.
 */
const StyledToggleGroup = styled(ToggleGroup.Root)`
  display: flex;
  padding: ${({ theme }) => theme.spaces[1]};
  background: ${({ theme }) => theme.colors.neutral100};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const StyledToggleItem = styled(ToggleGroup.Item)`
  display: flex;
  flex: 1 1 50%;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: 0.6rem ${({ theme }) => theme.spaces[3]};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.borderRadius};
  background: transparent;
  color: ${({ theme }) => theme.colors.neutral600};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes[1]};
  font-weight: ${({ theme }) => theme.fontWeights.semiBold};
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.neutral700};
  }

  &[data-state='on'] {
    background: ${({ theme }) => theme.colors.neutral0};
    border-color: ${({ theme }) => theme.colors.neutral200};
    color: ${({ theme }) => theme.colors.primary600};
  }

  svg {
    width: 1.6rem;
    height: 1.6rem;
  }
`;

// Toggle labels are hidden below desktop — icons only (buttons keep aria-label).
const ToggleLabel = styled.span`
  display: none;

  ${({ theme }) => theme.breakpoints.large} {
    display: inline;
  }
`;

interface ViewToggleProps {
  view: number;
  onChange: (view: number) => void;
  /** Drops the visible labels at every width, for narrow hosts like a modal. */
  iconsOnly?: boolean;
}

export const ViewToggle = ({ view, onChange, iconsOnly = false }: ViewToggleProps) => {
  const { formatMessage } = useIntl();

  const tableLabel = formatMessage({
    id: getTranslationKey('view.table'),
    defaultMessage: 'Table view',
  });
  const gridLabel = formatMessage({
    id: getTranslationKey('view.grid'),
    defaultMessage: 'Grid view',
  });

  return (
    <StyledToggleGroup
      type="single"
      value={view === viewOptions.GRID ? 'grid' : 'table'}
      onValueChange={(value) =>
        value && onChange(value === 'grid' ? viewOptions.GRID : viewOptions.TABLE)
      }
      aria-label={formatMessage({
        id: getTranslationKey('view.switch.label'),
        defaultMessage: 'View options',
      })}
    >
      <StyledToggleItem value="table" aria-label={tableLabel}>
        <List />
        {!iconsOnly && <ToggleLabel>{tableLabel}</ToggleLabel>}
      </StyledToggleItem>
      <StyledToggleItem value="grid" aria-label={gridLabel}>
        <GridIcon />
        {!iconsOnly && <ToggleLabel>{gridLabel}</ToggleLabel>}
      </StyledToggleItem>
    </StyledToggleGroup>
  );
};
