import { useState } from 'react';

import { Badge, Checkbox, Flex, Menu } from '@strapi/design-system';
import { Filter as FilterIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../utils/translations';
import {
  DATE_PRESETS,
  TYPE_VALUES,
  type DateField,
  type DatePreset,
  type ListFilters,
  type TypeValue,
} from '../hooks/useListFilters';

import { DateRangeCalendar } from './DateRangeCalendar';

import type { MessageDescriptor } from 'react-intl';

export const TYPE_LABELS: Record<TypeValue, MessageDescriptor> = {
  folder: { id: getTranslationKey('list.filters.type.folder'), defaultMessage: 'Folder' },
  picture: { id: getTranslationKey('list.filters.type.picture'), defaultMessage: 'Picture' },
  audio: { id: getTranslationKey('list.filters.type.audio'), defaultMessage: 'Audio' },
  video: { id: getTranslationKey('list.filters.type.video'), defaultMessage: 'Video' },
  document: { id: getTranslationKey('list.filters.type.document'), defaultMessage: 'Document' },
};

export const PRESET_LABELS: Record<DatePreset, MessageDescriptor> = {
  '1day': { id: getTranslationKey('list.filters.preset.1day'), defaultMessage: '1 day ago' },
  '3days': { id: getTranslationKey('list.filters.preset.3days'), defaultMessage: '3 days ago' },
  '1week': { id: getTranslationKey('list.filters.preset.1week'), defaultMessage: '1 week ago' },
  '1month': { id: getTranslationKey('list.filters.preset.1month'), defaultMessage: '1 month ago' },
  '3months': {
    id: getTranslationKey('list.filters.preset.3months'),
    defaultMessage: '3 months ago',
  },
  '6months': {
    id: getTranslationKey('list.filters.preset.6months'),
    defaultMessage: '6 months ago',
  },
  '1year': { id: getTranslationKey('list.filters.preset.1year'), defaultMessage: '1 year ago' },
};

export const DATE_FIELD_LABELS: Record<DateField, MessageDescriptor> = {
  createdAt: {
    id: getTranslationKey('list.filters.field.created'),
    defaultMessage: 'Creation date',
  },
  updatedAt: {
    id: getTranslationKey('list.filters.field.updated'),
    defaultMessage: 'Last modified',
  },
};

// The DS SubTrigger renders its chevron inline right after the label — push it
// to the far edge so every field row reads label · · · ›, like the mock.
const FieldSubTrigger = styled(Menu.SubTrigger)`
  width: 100%;
  justify-content: space-between;
`;

/** Every panel of the filter tree shares this fixed width (design). */
export const FILTER_PANEL_WIDTH = '24.2rem';

// Sub panels: fixed width, no 15rem clamp (the DS default folds the calendar),
// and a negative top margin cancelling the parent panel's padding + border so
// the sub panel's top edge lines up with the parent panel, not the item.
const SubPanel = styled(Menu.SubContent)`
  margin-top: calc(-1 * (${({ theme }) => theme.spaces[1]} + 1px));
`;

const CountBadge = styled(Badge)`
  height: 1.6rem;
  min-width: auto;
  padding: 0 0.4rem;
`;

interface FilterMenuProps {
  listFilters: ListFilters;
}

/**
 * Toolbar "Filter" dropdown. Picking anything ADDS a badge (editing happens on
 * the badge itself, see FilterBadges):
 *
 * - Type → keep-open checkbox list; the badge is created/updated live with the
 *   checked set (`is` by default, condition editable on the badge).
 * - Creation date / Last modified → preset list (single pick, `within the
 *   last` by default) + "Select date range" (creation date only) opening the
 *   range calendar; a completed range adds an `is` range badge.
 */
export const FilterMenu = ({ listFilters }: FilterMenuProps) => {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const { filters, addFilter, updateFilter, removeFilter } = listFilters;

  // The Type submenu edits the LAST type badge in place while the menu stays
  // open (checking values accumulates into one badge, per design).
  let lastTypeIndex = -1;
  for (let i = filters.length - 1; i >= 0; i -= 1) {
    if (filters[i].kind === 'type') {
      lastTypeIndex = i;
      break;
    }
  }
  const lastTypeFilter = lastTypeIndex >= 0 ? filters[lastTypeIndex] : null;
  const checkedValues =
    lastTypeFilter && lastTypeFilter.kind === 'type' ? lastTypeFilter.values : [];

  const toggleTypeValue = (value: TypeValue) => {
    const nextValues = checkedValues.includes(value)
      ? checkedValues.filter((v) => v !== value)
      : [...checkedValues, value];

    if (lastTypeFilter && lastTypeFilter.kind === 'type') {
      if (nextValues.length === 0) {
        // Unchecking the final value removes the badge outright — a type
        // filter with no values is not a state (it would serialize to a
        // malformed `type:is:` the parser drops anyway).
        removeFilter(lastTypeIndex);
      } else {
        updateFilter(lastTypeIndex, { ...lastTypeFilter, values: nextValues });
      }
    } else if (nextValues.length > 0) {
      addFilter({ kind: 'type', condition: 'is', values: nextValues });
    }
  };

  const addPreset = (field: DateField, preset: DatePreset) => {
    addFilter({ kind: 'date', field, mode: 'preset', condition: 'withinLast', preset });
  };

  const addRange = (from: string, to: string) => {
    addFilter({ kind: 'date', field: 'createdAt', mode: 'range', condition: 'is', from, to });
    // The calendar is not a Menu.Item — close the menu explicitly on commit.
    setIsOpen(false);
  };

  return (
    <Menu.Root open={isOpen} onOpenChange={setIsOpen}>
      {/* endIcon={null} drops the DS default chevron — the mock has none. */}
      <Menu.Trigger variant="tertiary" startIcon={<FilterIcon aria-hidden />} endIcon={null}>
        <Flex gap={2} alignItems="center" tag="span">
          {formatMessage({
            id: getTranslationKey('list.filters.trigger'),
            defaultMessage: 'Filter',
          })}
          {filters.length > 0 && <CountBadge>{filters.length}</CountBadge>}
        </Flex>
      </Menu.Trigger>
      <Menu.Content
        popoverPlacement="bottom-start"
        zIndex={2}
        maxHeight="70vh"
        width={FILTER_PANEL_WIDTH}
      >
        <Menu.SubRoot>
          <FieldSubTrigger>
            {formatMessage({
              id: getTranslationKey('list.filters.field.type'),
              defaultMessage: 'Type',
            })}
          </FieldSubTrigger>
          <SubPanel zIndex={2} maxHeight="70vh" width={FILTER_PANEL_WIDTH}>
            {/* Multi-select semantics: menuitemcheckbox + aria-checked carry the
                state for assistive tech; the Checkbox is purely decorative
                (aria-hidden, unfocusable) — the Menu.Item is the control. */}
            {TYPE_VALUES.map((value) => (
              <Menu.Item
                key={value}
                role="menuitemcheckbox"
                aria-checked={checkedValues.includes(value)}
                onSelect={(e: Event) => {
                  e.preventDefault();
                  toggleTypeValue(value);
                }}
                startIcon={
                  <Checkbox checked={checkedValues.includes(value)} tabIndex={-1} aria-hidden />
                }
              >
                {formatMessage(TYPE_LABELS[value])}
              </Menu.Item>
            ))}
          </SubPanel>
        </Menu.SubRoot>

        {(['createdAt', 'updatedAt'] as const).map((field) => (
          <Menu.SubRoot key={field}>
            <FieldSubTrigger>{formatMessage(DATE_FIELD_LABELS[field])}</FieldSubTrigger>
            <SubPanel zIndex={2} maxHeight="70vh" width={FILTER_PANEL_WIDTH}>
              {DATE_PRESETS.map((preset) => (
                <Menu.Item key={preset} onSelect={() => addPreset(field, preset)}>
                  {formatMessage(PRESET_LABELS[preset])}
                </Menu.Item>
              ))}
              {/* Design constraint: only Creation date offers a range from the
                  UI. The URL codec and the badges support ranges on both date
                  fields (`updated:rangeis:…` works when hand-crafted) so this
                  stays a one-line change if design extends it later. */}
              {field === 'createdAt' && (
                <Menu.SubRoot>
                  <FieldSubTrigger>
                    {formatMessage({
                      id: getTranslationKey('list.filters.select-date-range'),
                      defaultMessage: 'Select date range',
                    })}
                  </FieldSubTrigger>
                  <SubPanel zIndex={2} maxHeight="none" width={FILTER_PANEL_WIDTH}>
                    <DateRangeCalendar onSelect={addRange} />
                  </SubPanel>
                </Menu.SubRoot>
              )}
            </SubPanel>
          </Menu.SubRoot>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
};
