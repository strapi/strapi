import { useState } from 'react';

import { Checkbox, Flex, Popover, Typography } from '@strapi/design-system';
import { Check, Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../utils/translations';
import {
  DATE_PRESETS,
  TYPE_VALUES,
  type DateFilter,
  type DatePreset,
  type ListFilter,
  type ListFilters,
  type PresetCondition,
  type RangeCondition,
  type TypeCondition,
  type TypeFilter,
  type TypeValue,
} from '../hooks/useListFilters';
import { parseCalendarDate } from '../utils/buildAssetFilters';

import { DateRangeCalendar } from './DateRangeCalendar';
import { DATE_FIELD_LABELS, FILTER_PANEL_WIDTH, PRESET_LABELS, TYPE_LABELS } from './FilterMenu';

import type { MessageDescriptor } from 'react-intl';

/**
 * Row of applied-filter badges under the toolbar. A badge has three segments —
 * field (static), condition (click → select popover), value (click → type
 * checkboxes / preset list / range calendar) — plus a remove button.
 */

const BadgePill = styled(Flex)`
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral0};
  overflow: hidden;
`;

const Segment = styled.button<{ $interactive?: boolean }>`
  border: none;
  background: transparent;
  font: inherit;
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};

  ${({ $interactive, theme }) =>
    $interactive && `&:hover { background: ${theme.colors.primary100}; }`}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }
`;

// Non-interactive field segment (first pill cell).
const FieldSegment = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
`;

// Badge popovers mirror the filter-menu panels: same fixed width, same font.
const PanelPopoverContent = styled(Popover.Content)`
  width: ${FILTER_PANEL_WIDTH};
`;

// Option row inside a segment popover — sized like a DS Menu.Item so the badge
// dropdowns read as the same control family as the filter menu.
const OptionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spaces[4]};
  width: 100%;
  border: none;
  background: transparent;
  font-size: ${({ theme }) => theme.fontSizes[2]};
  line-height: ${({ theme }) => theme.lineHeights[4]};
  font-family: inherit;
  text-align: left;
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[4]}`};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.neutral800};

  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }
`;

const RemoveButton = styled.button`
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `0 ${theme.spaces[2]}`};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.neutral600};

  &:hover {
    color: ${({ theme }) => theme.colors.neutral800};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }
`;

const TYPE_CONDITION_LABELS: Record<TypeCondition, MessageDescriptor> = {
  is: { id: getTranslationKey('list.filters.condition.is'), defaultMessage: 'is' },
  isNot: { id: getTranslationKey('list.filters.condition.is-not'), defaultMessage: 'is not' },
};

const PRESET_CONDITION_LABELS: Record<PresetCondition, MessageDescriptor> = {
  isExactly: {
    id: getTranslationKey('list.filters.condition.is-exactly'),
    defaultMessage: 'is exactly',
  },
  withinLast: {
    id: getTranslationKey('list.filters.condition.within-last'),
    defaultMessage: 'within the last',
  },
  notWithinLast: {
    id: getTranslationKey('list.filters.condition.not-within-last'),
    defaultMessage: 'not within the last',
  },
};

const RANGE_CONDITION_LABELS: Record<RangeCondition, MessageDescriptor> = {
  is: { id: getTranslationKey('list.filters.condition.is'), defaultMessage: 'is' },
  isNot: { id: getTranslationKey('list.filters.condition.is-not'), defaultMessage: 'is not' },
};

/** A small single-choice popover listing options with a check on the active one. */
interface SegmentPopoverProps<T extends string> {
  label: string;
  options: T[];
  active: T;
  getOptionLabel: (option: T) => string;
  onPick: (option: T) => void;
}

const SegmentPopover = <T extends string>({
  label,
  options,
  active,
  getOptionLabel,
  onPick,
}: SegmentPopoverProps<T>) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Segment type="button" $interactive>
          <Typography variant="pi" textColor="neutral800">
            {label}
          </Typography>
        </Segment>
      </Popover.Trigger>
      <PanelPopoverContent>
        <Flex direction="column" alignItems="stretch" padding={1}>
          {options.map((option) => (
            <OptionButton
              key={option}
              type="button"
              onClick={() => {
                onPick(option);
                setOpen(false);
              }}
            >
              {getOptionLabel(option)}
              {option === active && <Check aria-hidden width="1.6rem" height="1.6rem" />}
            </OptionButton>
          ))}
        </Flex>
      </PanelPopoverContent>
    </Popover.Root>
  );
};

const TypeValuePopover = ({
  filter,
  onChange,
}: {
  filter: TypeFilter;
  onChange: (next: TypeFilter) => void;
}) => {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);

  const label = filter.values.map((value) => formatMessage(TYPE_LABELS[value])).join(', ');

  const toggleValue = (value: TypeValue) => {
    const nextValues = filter.values.includes(value)
      ? filter.values.filter((v) => v !== value)
      : [...filter.values, value];

    // At least one value stays checked — an empty badge is removed via ×, not here.
    if (nextValues.length > 0) {
      onChange({ ...filter, values: nextValues });
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Segment type="button" $interactive>
          <Typography variant="pi" textColor="neutral800">
            {label}
          </Typography>
        </Segment>
      </Popover.Trigger>
      <PanelPopoverContent>
        <Flex direction="column" alignItems="flex-start" padding={3} gap={2}>
          {TYPE_VALUES.map((value) => (
            <Checkbox
              key={value}
              checked={filter.values.includes(value)}
              onCheckedChange={() => toggleValue(value)}
            >
              {formatMessage(TYPE_LABELS[value])}
            </Checkbox>
          ))}
        </Flex>
      </PanelPopoverContent>
    </Popover.Root>
  );
};

const DateValuePopover = ({
  filter,
  onChange,
}: {
  filter: DateFilter;
  onChange: (next: DateFilter) => void;
}) => {
  const { formatMessage, formatDate } = useIntl();
  const [open, setOpen] = useState(false);

  // Parse as LOCAL calendar dates before formatting: react-intl would coerce
  // the raw `YYYY-MM-DD` strings via `new Date(value)` = UTC midnight, showing
  // the previous day in every timezone west of UTC while the query (also
  // local, see buildAssetFilters) filters the day the user actually picked.
  const label =
    filter.mode === 'preset'
      ? formatMessage(PRESET_LABELS[filter.preset])
      : `${formatDate(parseCalendarDate(filter.from), {
          day: '2-digit',
          month: 'short',
        })} - ${formatDate(parseCalendarDate(filter.to), {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}`;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Segment type="button" $interactive>
          <Typography variant="pi" textColor="neutral800">
            {label}
          </Typography>
        </Segment>
      </Popover.Trigger>
      <PanelPopoverContent>
        {filter.mode === 'preset' ? (
          <Flex direction="column" alignItems="stretch" padding={1}>
            {DATE_PRESETS.map((preset: DatePreset) => (
              <OptionButton
                key={preset}
                type="button"
                onClick={() => {
                  onChange({ ...filter, preset });
                  setOpen(false);
                }}
              >
                {formatMessage(PRESET_LABELS[preset])}
                {preset === filter.preset && <Check aria-hidden width="1.6rem" height="1.6rem" />}
              </OptionButton>
            ))}
          </Flex>
        ) : (
          <DateRangeCalendar
            from={filter.from}
            to={filter.to}
            onSelect={(from, to) => {
              onChange({ ...filter, from, to });
              setOpen(false);
            }}
          />
        )}
      </PanelPopoverContent>
    </Popover.Root>
  );
};

const FilterBadge = ({
  filter,
  onChange,
  onRemove,
}: {
  filter: ListFilter;
  onChange: (next: ListFilter) => void;
  onRemove: () => void;
}) => {
  const { formatMessage } = useIntl();

  const fieldLabel =
    filter.kind === 'type'
      ? formatMessage({ id: getTranslationKey('list.filters.field.type'), defaultMessage: 'Type' })
      : formatMessage(DATE_FIELD_LABELS[filter.field]);

  return (
    <BadgePill alignItems="stretch" data-testid="filter-badge">
      <FieldSegment>
        <Typography variant="pi" textColor="neutral600">
          {fieldLabel}
        </Typography>
      </FieldSegment>

      {filter.kind === 'type' && (
        <>
          <SegmentPopover
            label={formatMessage(TYPE_CONDITION_LABELS[filter.condition])}
            options={['is', 'isNot'] as TypeCondition[]}
            active={filter.condition}
            getOptionLabel={(option) => formatMessage(TYPE_CONDITION_LABELS[option])}
            onPick={(condition) => onChange({ ...filter, condition })}
          />
          <TypeValuePopover filter={filter} onChange={onChange} />
        </>
      )}

      {filter.kind === 'date' && filter.mode === 'preset' && (
        <>
          <SegmentPopover
            label={formatMessage(PRESET_CONDITION_LABELS[filter.condition])}
            options={['isExactly', 'withinLast', 'notWithinLast'] as PresetCondition[]}
            active={filter.condition}
            getOptionLabel={(option) => formatMessage(PRESET_CONDITION_LABELS[option])}
            onPick={(condition) => onChange({ ...filter, condition })}
          />
          <DateValuePopover filter={filter} onChange={onChange} />
        </>
      )}

      {filter.kind === 'date' && filter.mode === 'range' && (
        <>
          <SegmentPopover
            label={formatMessage(RANGE_CONDITION_LABELS[filter.condition])}
            options={['is', 'isNot'] as RangeCondition[]}
            active={filter.condition}
            getOptionLabel={(option) => formatMessage(RANGE_CONDITION_LABELS[option])}
            onPick={(condition) => onChange({ ...filter, condition })}
          />
          <DateValuePopover filter={filter} onChange={onChange} />
        </>
      )}

      <RemoveButton
        type="button"
        onClick={onRemove}
        aria-label={formatMessage(
          {
            id: getTranslationKey('list.filters.remove'),
            defaultMessage: 'Remove {filter} filter',
          },
          { filter: fieldLabel }
        )}
      >
        <Cross width="1.2rem" height="1.2rem" aria-hidden />
      </RemoveButton>
    </BadgePill>
  );
};

interface FilterBadgesProps {
  listFilters: ListFilters;
}

export const FilterBadges = ({ listFilters }: FilterBadgesProps) => {
  const { filters, updateFilter, removeFilter } = listFilters;

  if (filters.length === 0) {
    return null;
  }

  return (
    <Flex gap={2} wrap="wrap" paddingTop={2} data-testid="filter-badges">
      {filters.map((filter, index) => (
        <FilterBadge
          // Position is identity: badges are edited/removed by index.
          key={index}
          filter={filter}
          onChange={(next) => updateFilter(index, next)}
          onRemove={() => removeFilter(index)}
        />
      ))}
    </Flex>
  );
};
